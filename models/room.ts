import { Room } from '../types';

const rooms: Room[] = [
  { roomId: 'room-1', name: 'Conference Room A' },
  { roomId: 'room-2', name: 'Meeting Room B' },
  { roomId: 'room-3', name: 'Huddle Space C' },
];

export function getAllRooms(): Room[] {
  return [...rooms];
}

export function findRoomById(roomId: string): Room | undefined {
  return rooms.find((room) => room.roomId === roomId);
}

export function roomExists(roomId: string): boolean {
  return rooms.some((room) => room.roomId === roomId);
}

export function resetRooms(): void {
  rooms.length = 0;
  rooms.push(
    { roomId: 'room-1', name: 'Conference Room A' },
    { roomId: 'room-2', name: 'Meeting Room B' },
    { roomId: 'room-3', name: 'Huddle Space C' }
  );
}
