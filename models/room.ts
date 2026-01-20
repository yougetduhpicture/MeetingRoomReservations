import { Room } from '../types';

/**
 * In-Memory Room Storage
 * ----------------------
 * In a real application, this would be a database. For this demo,
 * we use a simple array that resets when the server restarts.
 *
 * TypeScript Concept: Type Annotation on Variables
 * ------------------------------------------------
 * 'Room[]' means "an array of Room objects". TypeScript will ensure
 * every item in this array matches the Room interface.
 */
const rooms: Room[] = [
  { roomId: 'room-1', name: 'Conference Room A' },
  { roomId: 'room-2', name: 'Meeting Room B' },
  { roomId: 'room-3', name: 'Huddle Space C' },
];

/**
 * Room Model Functions
 * --------------------
 * These functions provide a clean API for accessing room data.
 * If we later switch to a database, we only need to change these
 * functions - the rest of the app stays the same.
 */

/**
 * Get all rooms
 *
 * TypeScript Concept: Return Type Annotations
 * -------------------------------------------
 * ': Room[]' after the function parameters declares the return type.
 * TypeScript will verify the function actually returns this type.
 */
export function getAllRooms(): Room[] {
  return [...rooms]; // Return a copy to prevent external mutations
}

/**
 * Find a room by ID
 *
 * TypeScript Concept: Union Types with undefined
 * ----------------------------------------------
 * 'Room | undefined' means this function returns either a Room object
 * OR undefined (if not found). This forces callers to handle the
 * "not found" case, preventing null pointer errors.
 */
export function findRoomById(roomId: string): Room | undefined {
  return rooms.find((room) => room.roomId === roomId);
}

/**
 * Check if a room exists
 */
export function roomExists(roomId: string): boolean {
  return rooms.some((room) => room.roomId === roomId);
}

/**
 * Reset rooms to initial state (useful for testing)
 */
export function resetRooms(): void {
  rooms.length = 0;
  rooms.push(
    { roomId: 'room-1', name: 'Conference Room A' },
    { roomId: 'room-2', name: 'Meeting Room B' },
    { roomId: 'room-3', name: 'Huddle Space C' }
  );
}
