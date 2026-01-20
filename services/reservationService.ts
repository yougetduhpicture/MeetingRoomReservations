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
      // Different user - throw conflict error with details
      throw new ConflictError(
        `${room.name} is already booked from ${conflictingReservation.startTime}-${conflictingReservation.endTime} on ${date} by ${ownerName}. Please choose a different time slot.`,
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
