import { Reservation, CreateReservationRequest } from '../types';
import {
  createReservation,
  deleteReservation,
  findReservationById,
  findReservationsByRoomAndDateRange,
  getReservationsByRoomId,
  updateReservation,
} from '../models/reservation';
import { findRoomById, roomExists } from '../models/room';
import { findUserById, userExists } from '../models/user';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/ApiError';
import logger from '../utils/logger';

/**
 * Reservation Service
 * -------------------
 * Contains all business logic for reservation operations.
 *
 * Why a Service Layer?
 * --------------------
 * 1. Testability: Business logic can be tested without HTTP
 * 2. Reusability: Same logic can be used by different controllers
 * 3. Separation: Controllers handle HTTP, services handle business rules
 * 4. Maintainability: Changes to business rules happen in one place
 */

/**
 * Result type for creating reservations
 * -------------------------------------
 * Indicates whether the reservation was created new or updated existing.
 */
interface CreateReservationResult {
  reservation: Reservation;
  wasUpdated: boolean;
}

/**
 * Check if a time slot is in the past
 *
 * TypeScript Concept: Date Handling
 * ---------------------------------
 * JavaScript Date objects can be tricky. We construct a Date from
 * the ISO date string and time, then compare to now.
 */
function isTimeSlotInPast(startDate: string, startTime: string): boolean {
  // Construct full datetime string (assuming UTC for simplicity)
  const dateTimeString = `${startDate}T${startTime}:00`;
  const slotTime = new Date(dateTimeString);
  const now = new Date();

  return slotTime <= now;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string (HH:MM format)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a booking spans midnight
 * (when endTime is earlier than or equal to startTime in HH:MM format)
 */
function spansMidnight(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) <= timeToMinutes(startTime);
}

/**
 * Calculate endDate based on startDate and times
 * If booking spans midnight, endDate is the next day
 */
function calculateEndDate(startDate: string, startTime: string, endTime: string): string {
  if (spansMidnight(startTime, endTime)) {
    return getNextDate(startDate);
  }
  return startDate;
}

/**
 * Get the previous day's date string (YYYY-MM-DD)
 */
function getPreviousDate(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Get the next day's date string (YYYY-MM-DD)
 */
function getNextDate(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Check if a date is in the past (before today)
 */
function isDateInPast(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  return checkDate < today;
}

/**
 * Slot suggestion with optional date (for adjacent day suggestions)
 */
interface SlotSuggestion {
  time: string; // e.g., "09:00-10:30"
  date?: string; // e.g., "2026-06-03" (only set if different from requested date)
}

/**
 * Interval representing a booked time period
 */
interface BookedInterval {
  start: number; // minutes from midnight
  end: number; // minutes from midnight (can be > 24*60 for midnight-spanning)
}

/**
 * Get all booked intervals for a room on a specific date
 * Returns intervals in minutes from midnight, handling midnight-spanning bookings
 */
function getBookedIntervalsOnDate(
  roomId: string,
  date: string
): BookedInterval[] {
  const reservations = findReservationsByRoomAndDateRange(roomId, date, date);
  const intervals: BookedInterval[] = [];

  for (const res of reservations) {
    const startMin = timeToMinutes(res.startTime);
    const endMin = timeToMinutes(res.endTime);

    if (res.startDate === date && res.endDate === date) {
      // Same-day booking that starts and ends on this date
      intervals.push({ start: startMin, end: endMin });
    } else if (res.startDate === date && res.endDate !== date) {
      // Booking starts on this date and spans to next day
      intervals.push({ start: startMin, end: 24 * 60 });
    } else if (res.startDate !== date && res.endDate === date) {
      // Booking started on previous day and ends on this date
      intervals.push({ start: 0, end: endMin });
    }
  }

  // Sort by start time
  intervals.sort((a, b) => a.start - b.start);
  return intervals;
}

/**
 * Find available time windows on a specific date for a room
 * Returns windows that could fit a booking of the specified duration
 */
function findAvailableWindowsOnDate(
  roomId: string,
  date: string,
  durationMinutes: number
): Array<{ start: number; end: number }> {
  const bookedIntervals = getBookedIntervalsOnDate(roomId, date);
  const windows: Array<{ start: number; end: number }> = [];

  // Merge overlapping intervals
  const mergedIntervals: BookedInterval[] = [];
  for (const interval of bookedIntervals) {
    if (mergedIntervals.length === 0 || mergedIntervals[mergedIntervals.length - 1].end < interval.start) {
      mergedIntervals.push({ ...interval });
    } else {
      mergedIntervals[mergedIntervals.length - 1].end = Math.max(
        mergedIntervals[mergedIntervals.length - 1].end,
        interval.end
      );
    }
  }

  // Find gaps between booked intervals
  let currentStart = 0;
  for (const interval of mergedIntervals) {
    if (interval.start > currentStart) {
      const gapSize = interval.start - currentStart;
      if (gapSize >= durationMinutes) {
        windows.push({ start: currentStart, end: interval.start });
      }
    }
    currentStart = Math.max(currentStart, interval.end);
  }

  // Check if there's space after the last booking until end of day
  if (currentStart < 24 * 60) {
    const gapSize = 24 * 60 - currentStart;
    if (gapSize >= durationMinutes) {
      windows.push({ start: currentStart, end: 24 * 60 });
    }
  }

  return windows;
}

/**
 * Maximum number of days to search for available slots
 * Prevents infinite loops while providing reasonable coverage
 */
const MAX_SEARCH_DAYS = 30;

/**
 * Find the nearest available time slots before and after a given time
 *
 * Returns suggestions for alternative booking times when a conflict occurs.
 * Suggests windows that can fit a booking of the specified duration.
 * First searches the same day, then iterates through previous/next days
 * until an available slot is found (up to MAX_SEARCH_DAYS).
 */
function findNearestAvailableSlots(
  roomId: string,
  date: string,
  attemptedStartMinutes: number,
  durationMinutes: number
): { before: SlotSuggestion | null; after: SlotSuggestion | null } {
  let before: SlotSuggestion | null = null;
  let after: SlotSuggestion | null = null;

  // Get available windows on the requested date
  const sameDayWindows = findAvailableWindowsOnDate(roomId, date, durationMinutes);

  // Search for nearest available slot before attempted time (same day)
  for (const window of sameDayWindows) {
    // Window must end before or at the attempted start time
    if (window.end <= attemptedStartMinutes && window.end - window.start >= durationMinutes) {
      // Find the latest possible start time in this window
      const latestStart = window.end - durationMinutes;
      const endTime = minutesToTime(latestStart + durationMinutes);
      before = { time: `${minutesToTime(latestStart)}-${endTime}` };
    }
  }

  // Search for nearest available slot after attempted time (same day)
  for (const window of sameDayWindows) {
    // Window must start after the attempted start time
    if (window.start > attemptedStartMinutes) {
      const endTime = minutesToTime(window.start + durationMinutes);
      after = { time: `${minutesToTime(window.start)}-${endTime}` };
      break;
    }
  }

  // If no earlier slot on same day, search previous days (up to MAX_SEARCH_DAYS)
  if (!before) {
    let searchDate = date;
    for (let day = 0; day < MAX_SEARCH_DAYS; day++) {
      searchDate = getPreviousDate(searchDate);
      if (isDateInPast(searchDate)) {
        break; // Don't search past dates
      }
      const dayWindows = findAvailableWindowsOnDate(roomId, searchDate, durationMinutes);
      if (dayWindows.length > 0) {
        // Find the latest window on this day
        const lastWindow = dayWindows[dayWindows.length - 1];
        const latestStart = lastWindow.end - durationMinutes;
        const endTime = minutesToTime(latestStart + durationMinutes);
        before = {
          time: `${minutesToTime(latestStart)}-${endTime}`,
          date: searchDate,
        };
        break;
      }
    }
  }

  // If no later slot on same day, search next days (up to MAX_SEARCH_DAYS)
  if (!after) {
    let searchDate = date;
    for (let day = 0; day < MAX_SEARCH_DAYS; day++) {
      searchDate = getNextDate(searchDate);
      const dayWindows = findAvailableWindowsOnDate(roomId, searchDate, durationMinutes);
      if (dayWindows.length > 0) {
        // Find the earliest window on this day
        const firstWindow = dayWindows[0];
        const endTime = minutesToTime(firstWindow.start + durationMinutes);
        after = {
          time: `${minutesToTime(firstWindow.start)}-${endTime}`,
          date: searchDate,
        };
        break;
      }
    }
  }

  return { before, after };
}

/**
 * Format a slot suggestion for display
 */
function formatSlotSuggestion(slot: SlotSuggestion): string {
  if (slot.date) {
    return `${slot.date} at ${slot.time}`;
  }
  return slot.time;
}

/**
 * Build suggestion message for available time slots
 */
function buildSuggestionMessage(
  before: SlotSuggestion | null,
  after: SlotSuggestion | null
): string {
  const beforeOnDifferentDay = before?.date !== undefined;
  const afterOnDifferentDay = after?.date !== undefined;

  if (before && after) {
    // Both suggestions available
    if (!beforeOnDifferentDay && !afterOnDifferentDay) {
      // Both on same day
      return ` Nearest available slots: ${before.time} (earlier) or ${after.time} (later).`;
    } else {
      // At least one on different day - include full format
      return ` Nearest available slots: ${formatSlotSuggestion(before)} or ${formatSlotSuggestion(after)}.`;
    }
  } else if (before) {
    return ` Nearest available slot: ${formatSlotSuggestion(before)}.`;
  } else if (after) {
    return ` Nearest available slot: ${formatSlotSuggestion(after)}.`;
  }
  return ' No available slots found.';
}

/**
 * Convert a date-time to absolute minutes from a reference point
 * This allows comparing times across different dates
 */
function dateTimeToAbsoluteMinutes(date: string, time: string): number {
  const d = new Date(date);
  // Days since epoch as base, plus minutes within the day
  const daysSinceEpoch = Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
  return daysSinceEpoch * 24 * 60 + timeToMinutes(time);
}

/**
 * Check if two reservations overlap in time
 *
 * Handles all cases:
 * - Same-day bookings with flexible durations
 * - Same-day vs midnight-spanning bookings
 * - Midnight-spanning vs midnight-spanning bookings
 *
 * Two reservations overlap if their time ranges intersect on any date.
 */
function doReservationsOverlap(
  res1StartDate: string,
  res1EndDate: string,
  res1StartTime: string,
  res1EndTime: string,
  res2StartDate: string,
  res2EndDate: string,
  res2StartTime: string,
  res2EndTime: string
): boolean {
  // Convert to absolute minutes for comparison
  const res1Start = dateTimeToAbsoluteMinutes(res1StartDate, res1StartTime);
  const res1End = dateTimeToAbsoluteMinutes(res1EndDate, res1EndTime);
  const res2Start = dateTimeToAbsoluteMinutes(res2StartDate, res2StartTime);
  const res2End = dateTimeToAbsoluteMinutes(res2EndDate, res2EndTime);

  // Two intervals overlap if: start1 < end2 AND end1 > start2
  return res1Start < res2End && res1End > res2Start;
}


/**
 * Calculate booking duration in minutes
 * Handles both same-day and midnight-spanning bookings
 */
function calculateDurationMinutes(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes > startMinutes) {
    // Same-day booking (e.g., 09:00 to 17:00)
    return endMinutes - startMinutes;
  } else {
    // Midnight-spanning booking (e.g., 23:00 to 02:00)
    return (24 * 60 - startMinutes) + endMinutes;
  }
}

/**
 * Create a new reservation
 * ------------------------
 * Business Rules:
 * 1. Time slot must be in the future
 * 2. Room must exist
 * 3. User must exist
 * 4. No overlapping reservations (with special handling for same user)
 *
 * Supports:
 * - Flexible booking durations (not just 1-hour slots)
 * - Midnight-spanning bookings (e.g., 23:00-02:00)
 *
 * If the same user has an overlapping reservation, we UPDATE it.
 * If a different user has an overlapping reservation, we throw ConflictError.
 */
export async function createNewReservation(
  data: CreateReservationRequest,
  userId: string
): Promise<CreateReservationResult> {
  const { roomId, startDate, startTime, endTime } = data;

  // Calculate endDate (next day if booking spans midnight)
  const endDate = calculateEndDate(startDate, startTime, endTime);
  const durationMinutes = calculateDurationMinutes(startTime, endTime);

  logger.debug('Creating reservation', {
    roomId,
    startDate,
    endDate,
    startTime,
    endTime,
    durationMinutes,
    userId,
  });

  // Validate: Time slot must be in the future
  if (isTimeSlotInPast(startDate, startTime)) {
    throw new ValidationError(
      'Cannot create a reservation in the past. Please select a future date and time.'
    );
  }

  // Validate: Room must exist
  const room = findRoomById(roomId);
  if (!room) {
    throw new NotFoundError(
      `Room '${roomId}' not found. Please select a valid room.`
    );
  }

  // Validate: User must exist (they're authenticated, but double-check)
  if (!userExists(userId)) {
    throw new NotFoundError('User not found');
  }

  // Check for conflicting reservations
  // Get all reservations that overlap with the date range of this booking
  const existingReservations = findReservationsByRoomAndDateRange(roomId, startDate, endDate);
  const conflictingReservation = existingReservations.find((res) =>
    doReservationsOverlap(
      startDate,
      endDate,
      startTime,
      endTime,
      res.startDate,
      res.endDate,
      res.startTime,
      res.endTime
    )
  );

  if (conflictingReservation) {
    // Get the owner of the conflicting reservation
    const conflictOwner = findUserById(conflictingReservation.userId);
    const ownerName = conflictOwner?.name || 'Unknown User';

    if (conflictingReservation.userId === userId) {
      // Same user - UPDATE the existing reservation
      logger.info('Updating existing reservation for same user', {
        reservationId: conflictingReservation.reservationId,
        oldTime: `${conflictingReservation.startTime}-${conflictingReservation.endTime}`,
        newTime: `${startTime}-${endTime}`,
      });

      const updated = updateReservation(conflictingReservation.reservationId, {
        startDate,
        endDate,
        startTime,
        endTime,
      });

      if (!updated) {
        throw new Error('Failed to update reservation');
      }

      return {
        reservation: updated,
        wasUpdated: true,
      };
    } else {
      // Different user - find available alternatives and throw conflict error
      const attemptedStartMinutes = timeToMinutes(startTime);
      const { before, after } = findNearestAvailableSlots(
        roomId,
        startDate,
        attemptedStartMinutes,
        durationMinutes
      );
      const suggestionMessage = buildSuggestionMessage(before, after);

      // Format conflict message with date range for midnight-spanning
      const dateInfo = conflictingReservation.startDate === conflictingReservation.endDate
        ? `on ${conflictingReservation.startDate}`
        : `from ${conflictingReservation.startDate} to ${conflictingReservation.endDate}`;

      throw new ConflictError(
        `${room.name} is already booked from ${conflictingReservation.startTime}-${conflictingReservation.endTime} ${dateInfo} by ${ownerName}.${suggestionMessage}`,
        {
          existingReservation: {
            reservationId: conflictingReservation.reservationId,
            userId: conflictingReservation.userId,
            userName: ownerName,
            startDate: conflictingReservation.startDate,
            endDate: conflictingReservation.endDate,
            startTime: conflictingReservation.startTime,
            endTime: conflictingReservation.endTime,
          },
        }
      );
    }
  }

  // No conflicts - create new reservation
  const newReservation = createReservation({
    roomId,
    userId,
    startDate,
    endDate,
    startTime,
    endTime,
  });

  logger.info('Reservation created', {
    reservationId: newReservation.reservationId,
    roomId,
    startDate,
    endDate,
    time: `${startTime}-${endTime}`,
  });

  return {
    reservation: newReservation,
    wasUpdated: false,
  };
}

/**
 * Delete a reservation
 * --------------------
 * Business Rules:
 * 1. Reservation must exist
 * 2. User must own the reservation
 */
export async function cancelReservation(
  reservationId: string,
  userId: string
): Promise<void> {
  logger.debug('Attempting to delete reservation', { reservationId, userId });

  // Find the reservation
  const reservation = findReservationById(reservationId);

  if (!reservation) {
    throw new NotFoundError(
      `Reservation '${reservationId}' not found. It may have already been cancelled.`
    );
  }

  // Check ownership
  if (reservation.userId !== userId) {
    const owner = findUserById(reservation.userId);
    throw new ForbiddenError(
      `You cannot cancel this reservation. It belongs to ${owner?.name || 'another user'}.`
    );
  }

  // Delete the reservation
  const deleted = deleteReservation(reservationId);

  if (!deleted) {
    throw new Error('Failed to delete reservation');
  }

  logger.info('Reservation cancelled', { reservationId, userId });
}

/**
 * Get all reservations for a room
 * -------------------------------
 * Business Rules:
 * 1. Room must exist
 */
export async function getRoomReservations(
  roomId: string
): Promise<Reservation[]> {
  logger.debug('Getting reservations for room', { roomId });

  // Validate: Room must exist
  if (!roomExists(roomId)) {
    const rooms = ['room-1', 'room-2', 'room-3'];
    throw new NotFoundError(
      `Room '${roomId}' not found. Available rooms: ${rooms.join(', ')}`
    );
  }

  const reservations = getReservationsByRoomId(roomId);

  logger.debug('Retrieved room reservations', {
    roomId,
    count: reservations.length,
  });

  return reservations;
}

/**
 * Get a single reservation by ID
 * ------------------------------
 * Useful for fetching reservation details.
 */
export async function getReservation(
  reservationId: string
): Promise<Reservation> {
  const reservation = findReservationById(reservationId);

  if (!reservation) {
    throw new NotFoundError(`Reservation '${reservationId}' not found.`);
  }

  return reservation;
}
