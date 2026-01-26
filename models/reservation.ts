import { v4 as uuidv4 } from 'uuid';
import { Reservation } from '../types';

const reservations: Reservation[] = [
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
  },
];

export function getAllReservations(): Reservation[] {
  return [...reservations];
}

export function findReservationById(
  reservationId: string
): Reservation | undefined {
  return reservations.find((res) => res.reservationId === reservationId);
}

export function getReservationsByRoomId(roomId: string): Reservation[] {
  return reservations.filter((res) => res.roomId === roomId);
}

export function getReservationsByUserId(userId: string): Reservation[] {
  return reservations.filter((res) => res.userId === userId);
}

export function findReservationsByRoomAndDate(
  roomId: string,
  date: string
): Reservation[] {
  return reservations.filter(
    (res) => res.roomId === roomId && res.startDate <= date && res.endDate >= date
  );
}

export function findReservationsByRoomAndDateRange(
  roomId: string,
  startDate: string,
  endDate: string
): Reservation[] {
  return reservations.filter(
    (res) =>
      res.roomId === roomId &&
      res.startDate <= endDate &&
      res.endDate >= startDate
  );
}

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

  reservations[index] = {
    ...reservations[index],
    ...data,
  };

  return reservations[index];
}

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
