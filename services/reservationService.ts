import { Reservation, CreateReservationRequest } from '../types';
import {
  createReservation,
  deleteReservation,
  findReservationById,
  findReservationsByRoomAndDate,
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
function isTimeSlotInPast(date: string, startTime: string): boolean {
  // Construct full datetime string (assuming UTC for simplicity)
  const dateTimeString = `${date}T${startTime}:00`;
  const slotTime = new Date(dateTimeString);
  const now = new Date();

  return slotTime <= now;
}

/**
 * Convert time string to hour number
 */
function timeToHour(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

/**
 * Convert hour number to time string (HH:00 format)
 */
function hourToTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
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
  time: string; // e.g., "09:00-10:00"
  date?: string; // e.g., "2026-06-03" (only set if different from requested date)
}

/**
 * Find available slots on a specific date for a room
 */
function findAvailableSlotsOnDate(
  roomId: string,
  date: string
): Set<number> {
  const reservations = findReservationsByRoomAndDate(roomId, date);
  const bookedHours = new Set(
    reservations.map((res) => timeToHour(res.startTime))
  );

  const availableHours = new Set<number>();
  for (let hour = 0; hour <= 23; hour++) {
    if (!bookedHours.has(hour)) {
      availableHours.add(hour);
    }
  }
  return availableHours;
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
 * First searches the same day, then iterates through previous/next days
 * until an available slot is found (up to MAX_SEARCH_DAYS).
 */
function findNearestAvailableSlots(
  roomId: string,
  date: string,
  attemptedStartHour: number
): { before: SlotSuggestion | null; after: SlotSuggestion | null } {
  // Get available hours on the requested date
  const sameDayAvailable = findAvailableSlotsOnDate(roomId, date);

  let before: SlotSuggestion | null = null;
  let after: SlotSuggestion | null = null;

  // Search backwards for nearest available slot before attempted time (same day)
  for (let hour = attemptedStartHour - 1; hour >= 0; hour--) {
    if (sameDayAvailable.has(hour)) {
      before = { time: `${hourToTime(hour)}-${hourToTime(hour + 1)}` };
      break;
    }
  }

  // Search forwards for nearest available slot after attempted time (same day)
  for (let hour = attemptedStartHour + 1; hour <= 23; hour++) {
    if (sameDayAvailable.has(hour)) {
      after = { time: `${hourToTime(hour)}-${hourToTime(hour + 1)}` };
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
      const dayAvailable = findAvailableSlotsOnDate(roomId, searchDate);
      // Find the latest available slot on this day
      for (let hour = 23; hour >= 0; hour--) {
        if (dayAvailable.has(hour)) {
          before = {
            time: `${hourToTime(hour)}-${hourToTime(hour + 1)}`,
            date: searchDate,
          };
          break;
        }
      }
      if (before) break; // Found a slot, stop searching
    }
  }

  // If no later slot on same day, search next days (up to MAX_SEARCH_DAYS)
  if (!after) {
    let searchDate = date;
    for (let day = 0; day < MAX_SEARCH_DAYS; day++) {
      searchDate = getNextDate(searchDate);
      const dayAvailable = findAvailableSlotsOnDate(roomId, searchDate);
      // Find the earliest available slot on this day
      for (let hour = 0; hour <= 23; hour++) {
        if (dayAvailable.has(hour)) {
          after = {
            time: `${hourToTime(hour)}-${hourToTime(hour + 1)}`,
            date: searchDate,
          };
          break;
        }
      }
      if (after) break; // Found a slot, stop searching
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
 * Check if two time slots overlap
 *
 * Two slots overlap if one starts before the other ends AND
 * ends after the other starts.
 *
 * For 1-hour slots, this simplifies to checking if the start times match.
 */
function doTimeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert to minutes for easier comparison
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start1Min = toMinutes(start1);
  const end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);
  const end2Min = toMinutes(end2);

  // Overlap exists if: start1 < end2 AND end1 > start2
  return start1Min < end2Min && end1Min > start2Min;
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
 * If the same user has an overlapping reservation, we UPDATE it.
 * If a different user has an overlapping reservation, we throw ConflictError.
 */
export async function createNewReservation(
  data: CreateReservationRequest,
  userId: string
): Promise<CreateReservationResult> {
  const { roomId, date, startTime, endTime } = data;

  logger.debug('Creating reservation', { roomId, date, startTime, userId });

  // Validate: Time slot must be in the future
  if (isTimeSlotInPast(date, startTime)) {
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
  const existingReservations = findReservationsByRoomAndDate(roomId, date);
  const conflictingReservation = existingReservations.find((res) =>
    doTimeSlotsOverlap(startTime, endTime, res.startTime, res.endTime)
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
      const attemptedHour = timeToHour(startTime);
      const { before, after } = findNearestAvailableSlots(
        roomId,
        date,
        attemptedHour
      );
      const suggestionMessage = buildSuggestionMessage(before, after);

      throw new ConflictError(
        `${room.name} is already booked from ${conflictingReservation.startTime}-${conflictingReservation.endTime} on ${date} by ${ownerName}.${suggestionMessage}`,
        {
          existingReservation: {
            reservationId: conflictingReservation.reservationId,
            userId: conflictingReservation.userId,
            userName: ownerName,
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
    date,
    startTime,
    endTime,
  });

  logger.info('Reservation created', {
    reservationId: newReservation.reservationId,
    roomId,
    date,
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
