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

interface CreateReservationResult {
  reservation: Reservation;
  wasUpdated: boolean;
}

function isTimeSlotInPast(startDate: string, startTime: string): boolean {
  const dateTimeString = `${startDate}T${startTime}:00`;
  const slotTime = new Date(dateTimeString);
  const now = new Date();
  return slotTime <= now;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function spansMidnight(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) <= timeToMinutes(startTime);
}

function calculateEndDate(startDate: string, startTime: string, endTime: string): string {
  if (spansMidnight(startTime, endTime)) {
    return getNextDate(startDate);
  }
  return startDate;
}

function getPreviousDate(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getNextDate(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function isDateInPast(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  return checkDate < today;
}

interface SlotSuggestion {
  time: string;
  date?: string;
}

interface BookedInterval {
  start: number;
  end: number;
}

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
      intervals.push({ start: startMin, end: endMin });
    } else if (res.startDate === date && res.endDate !== date) {
      intervals.push({ start: startMin, end: 24 * 60 });
    } else if (res.startDate !== date && res.endDate === date) {
      intervals.push({ start: 0, end: endMin });
    }
  }

  intervals.sort((a, b) => a.start - b.start);
  return intervals;
}

function findAvailableWindowsOnDate(
  roomId: string,
  date: string,
  durationMinutes: number
): Array<{ start: number; end: number }> {
  const bookedIntervals = getBookedIntervalsOnDate(roomId, date);
  const windows: Array<{ start: number; end: number }> = [];

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

  if (currentStart < 24 * 60) {
    const gapSize = 24 * 60 - currentStart;
    if (gapSize >= durationMinutes) {
      windows.push({ start: currentStart, end: 24 * 60 });
    }
  }

  return windows;
}

const MAX_SEARCH_DAYS = 30;

function findNearestAvailableSlots(
  roomId: string,
  date: string,
  attemptedStartMinutes: number,
  durationMinutes: number
): { before: SlotSuggestion | null; after: SlotSuggestion | null } {
  let before: SlotSuggestion | null = null;
  let after: SlotSuggestion | null = null;

  const sameDayWindows = findAvailableWindowsOnDate(roomId, date, durationMinutes);

  for (const window of sameDayWindows) {
    if (window.end <= attemptedStartMinutes && window.end - window.start >= durationMinutes) {
      const latestStart = window.end - durationMinutes;
      const endTime = minutesToTime(latestStart + durationMinutes);
      before = { time: `${minutesToTime(latestStart)}-${endTime}` };
    }
  }

  for (const window of sameDayWindows) {
    if (window.start > attemptedStartMinutes) {
      const endTime = minutesToTime(window.start + durationMinutes);
      after = { time: `${minutesToTime(window.start)}-${endTime}` };
      break;
    }
  }

  if (!before) {
    let searchDate = date;
    for (let day = 0; day < MAX_SEARCH_DAYS; day++) {
      searchDate = getPreviousDate(searchDate);
      if (isDateInPast(searchDate)) {
        break;
      }
      const dayWindows = findAvailableWindowsOnDate(roomId, searchDate, durationMinutes);
      if (dayWindows.length > 0) {
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

  if (!after) {
    let searchDate = date;
    for (let day = 0; day < MAX_SEARCH_DAYS; day++) {
      searchDate = getNextDate(searchDate);
      const dayWindows = findAvailableWindowsOnDate(roomId, searchDate, durationMinutes);
      if (dayWindows.length > 0) {
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

function formatSlotSuggestion(slot: SlotSuggestion): string {
  if (slot.date) {
    return `${slot.date} at ${slot.time}`;
  }
  return slot.time;
}

function buildSuggestionMessage(
  before: SlotSuggestion | null,
  after: SlotSuggestion | null
): string {
  const beforeOnDifferentDay = before?.date !== undefined;
  const afterOnDifferentDay = after?.date !== undefined;

  if (before && after) {
    if (!beforeOnDifferentDay && !afterOnDifferentDay) {
      return ` Nearest available slots: ${before.time} (earlier) or ${after.time} (later).`;
    } else {
      return ` Nearest available slots: ${formatSlotSuggestion(before)} or ${formatSlotSuggestion(after)}.`;
    }
  } else if (before) {
    return ` Nearest available slot: ${formatSlotSuggestion(before)}.`;
  } else if (after) {
    return ` Nearest available slot: ${formatSlotSuggestion(after)}.`;
  }
  return ' No available slots found.';
}

function dateTimeToAbsoluteMinutes(date: string, time: string): number {
  const d = new Date(date);
  const daysSinceEpoch = Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
  return daysSinceEpoch * 24 * 60 + timeToMinutes(time);
}

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
  const res1Start = dateTimeToAbsoluteMinutes(res1StartDate, res1StartTime);
  const res1End = dateTimeToAbsoluteMinutes(res1EndDate, res1EndTime);
  const res2Start = dateTimeToAbsoluteMinutes(res2StartDate, res2StartTime);
  const res2End = dateTimeToAbsoluteMinutes(res2EndDate, res2EndTime);

  return res1Start < res2End && res1End > res2Start;
}

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes > startMinutes) {
    return endMinutes - startMinutes;
  } else {
    return (24 * 60 - startMinutes) + endMinutes;
  }
}

export async function createNewReservation(
  data: CreateReservationRequest,
  userId: string
): Promise<CreateReservationResult> {
  const { roomId, startDate, startTime, endTime } = data;

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

  if (isTimeSlotInPast(startDate, startTime)) {
    throw new ValidationError(
      'Cannot create a reservation in the past. Please select a future date and time.'
    );
  }

  const room = findRoomById(roomId);
  if (!room) {
    throw new NotFoundError(
      `Room '${roomId}' not found. Please select a valid room.`
    );
  }

  if (!userExists(userId)) {
    throw new NotFoundError('User not found');
  }

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
    const conflictOwner = findUserById(conflictingReservation.userId);
    const ownerName = conflictOwner?.name || 'Unknown User';

    if (conflictingReservation.userId === userId) {
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
      const attemptedStartMinutes = timeToMinutes(startTime);
      const { before, after } = findNearestAvailableSlots(
        roomId,
        startDate,
        attemptedStartMinutes,
        durationMinutes
      );
      const suggestionMessage = buildSuggestionMessage(before, after);

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

export async function cancelReservation(
  reservationId: string,
  userId: string
): Promise<void> {
  logger.debug('Attempting to delete reservation', { reservationId, userId });

  const reservation = findReservationById(reservationId);

  if (!reservation) {
    throw new NotFoundError(
      `Reservation '${reservationId}' not found. It may have already been cancelled.`
    );
  }

  if (reservation.userId !== userId) {
    const owner = findUserById(reservation.userId);
    throw new ForbiddenError(
      `You cannot cancel this reservation. It belongs to ${owner?.name || 'another user'}.`
    );
  }

  const deleted = deleteReservation(reservationId);

  if (!deleted) {
    throw new Error('Failed to delete reservation');
  }

  logger.info('Reservation cancelled', { reservationId, userId });
}

export async function getRoomReservations(
  roomId: string
): Promise<Reservation[]> {
  logger.debug('Getting reservations for room', { roomId });

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

export async function getReservation(
  reservationId: string
): Promise<Reservation> {
  const reservation = findReservationById(reservationId);

  if (!reservation) {
    throw new NotFoundError(`Reservation '${reservationId}' not found.`);
  }

  return reservation;
}
