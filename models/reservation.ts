import { v4 as uuidv4 } from 'uuid';
import { Reservation } from '../types';

/**
 * In-Memory Reservation Storage
 * -----------------------------
 * Seed data: 5 reservations in the first week of June 2026.
 * Includes examples of various booking durations.
 *
 * Note: startDate and endDate are the same for same-day bookings.
 * For midnight-spanning bookings, endDate would be startDate + 1 day.
 */
const reservations: Reservation[] = [
  {
    reservationId: 'res-1',
    roomId: 'room-1',
    userId: 'user-1', // Alice
    startDate: '2026-06-02', // Tuesday
    endDate: '2026-06-02',
    startTime: '09:00',
    endTime: '10:30', // 1.5 hour meeting
  },
  {
    reservationId: 'res-2',
    roomId: 'room-1',
    userId: 'user-2', // Bob
    startDate: '2026-06-02', // Tuesday
    endDate: '2026-06-02',
    startTime: '14:00',
    endTime: '16:00', // 2 hour meeting
  },
  {
    reservationId: 'res-3',
    roomId: 'room-2',
    userId: 'user-1', // Alice
    startDate: '2026-06-03', // Wednesday
    endDate: '2026-06-03',
    startTime: '10:00',
    endTime: '11:00', // 1 hour meeting
  },
  {
    reservationId: 'res-4',
    roomId: 'room-2',
    userId: 'user-2', // Bob
    startDate: '2026-06-04', // Thursday
    endDate: '2026-06-04',
    startTime: '13:00',
    endTime: '14:30', // 1.5 hour meeting
  },
  {
    reservationId: 'res-5',
    roomId: 'room-3',
    userId: 'user-1', // Alice
    startDate: '2026-06-05', // Friday
    endDate: '2026-06-05',
    startTime: '15:00',
    endTime: '17:00', // 2 hour meeting
  },
];

/**
 * Reservation Model Functions
 * ---------------------------
 * CRUD operations for reservations. No business logic here -
 * that belongs in the service layer.
 */

/**
 * Get all reservations
 */
export function getAllReservations(): Reservation[] {
  return [...reservations];
}

/**
 * Find a reservation by ID
 */
export function findReservationById(
  reservationId: string
): Reservation | undefined {
  return reservations.find((res) => res.reservationId === reservationId);
}

/**
 * Get all reservations for a specific room
 */
export function getReservationsByRoomId(roomId: string): Reservation[] {
  return reservations.filter((res) => res.roomId === roomId);
}

/**
 * Get all reservations for a specific user
 */
export function getReservationsByUserId(userId: string): Reservation[] {
  return reservations.filter((res) => res.userId === userId);
}

/**
 * Find reservations for a room that overlap with a specific date
 * --------------------------------------------------------------
 * A reservation overlaps with a date if the date falls between
 * the reservation's startDate and endDate (inclusive).
 *
 * Used for conflict detection in the service layer.
 */
export function findReservationsByRoomAndDate(
  roomId: string,
  date: string
): Reservation[] {
  return reservations.filter(
    (res) => res.roomId === roomId && res.startDate <= date && res.endDate >= date
  );
}

/**
 * Find reservations for a room within a date range
 * -------------------------------------------------
 * Returns all reservations that overlap with any date in the given range.
 * Used for checking conflicts with midnight-spanning bookings.
 */
export function findReservationsByRoomAndDateRange(
  roomId: string,
  startDate: string,
  endDate: string
): Reservation[] {
  return reservations.filter(
    (res) =>
      res.roomId === roomId &&
      // Reservation overlaps with date range if:
      // reservation starts before range ends AND reservation ends after range starts
      res.startDate <= endDate &&
      res.endDate >= startDate
  );
}

/**
 * Create a new reservation
 *
 * TypeScript Concept: Omit for Create Operations
 * ----------------------------------------------
 * When creating a new reservation, the caller provides everything
 * except the ID (which we generate). Omit<Reservation, 'reservationId'>
 * creates a type without the reservationId property.
 */
export function createReservation(
  data: Omit<Reservation, 'reservationId'>
): Reservation {
  const newReservation: Reservation = {
    reservationId: uuidv4(),
    ...data,
  };
  reservations.push(newReservation);
  return newReservation;
}

/**
 * Update an existing reservation
 *
 * TypeScript Concept: Partial for Updates
 * ---------------------------------------
 * Partial<Reservation> makes all properties optional. This allows
 * updating only specific fields without providing the entire object.
 *
 * Returns the updated reservation or undefined if not found.
 */
export function updateReservation(
  reservationId: string,
  data: Partial<Omit<Reservation, 'reservationId'>>
): Reservation | undefined {
  const index = reservations.findIndex(
    (res) => res.reservationId === reservationId
  );
  if (index === -1) {
    return undefined;
  }

  // Merge existing reservation with updates
  reservations[index] = {
    ...reservations[index],
    ...data,
  };

  return reservations[index];
}

/**
 * Delete a reservation
 *
 * Returns true if deleted, false if not found.
 */
export function deleteReservation(reservationId: string): boolean {
  const index = reservations.findIndex(
    (res) => res.reservationId === reservationId
  );
  if (index === -1) {
    return false;
  }
  reservations.splice(index, 1);
  return true;
}

/**
 * Reset reservations to initial state (useful for testing)
 */
export function resetReservations(): void {
  reservations.length = 0;
  reservations.push(
    {
      reservationId: 'res-1',
      roomId: 'room-1',
      userId: 'user-1',
      startDate: '2026-06-02',
      endDate: '2026-06-02',
      startTime: '09:00',
      endTime: '10:30',
    },
    {
      reservationId: 'res-2',
      roomId: 'room-1',
      userId: 'user-2',
      startDate: '2026-06-02',
      endDate: '2026-06-02',
      startTime: '14:00',
      endTime: '16:00',
    },
    {
      reservationId: 'res-3',
      roomId: 'room-2',
      userId: 'user-1',
      startDate: '2026-06-03',
      endDate: '2026-06-03',
      startTime: '10:00',
      endTime: '11:00',
    },
    {
      reservationId: 'res-4',
      roomId: 'room-2',
      userId: 'user-2',
      startDate: '2026-06-04',
      endDate: '2026-06-04',
      startTime: '13:00',
      endTime: '14:30',
    },
    {
      reservationId: 'res-5',
      roomId: 'room-3',
      userId: 'user-1',
      startDate: '2026-06-05',
      endDate: '2026-06-05',
      startTime: '15:00',
      endTime: '17:00',
    }
  );
}
