/**
 * TypeScript Concept: Centralized Type Definitions
 * ------------------------------------------------
 * By keeping all our interfaces in one place, we ensure consistency across
 * the entire application. Any file that needs these types can import them
 * from here, and if we need to change a type, we only change it in one place.
 */

/**
 * Room Entity
 * -----------
 * Represents a meeting room that can be reserved.
 */
export interface Room {
  roomId: string;
  name: string;
}

/**
 * Reservation Entity
 * ------------------
 * Represents a room reservation with time slot information.
 * Supports flexible duration bookings and midnight-spanning reservations.
 *
 * TypeScript Concept: String Literal Comments
 * -------------------------------------------
 * The comments like "ISO date string" and "HH:MM format" are documentation
 * hints. In a more advanced setup, you could use branded types or template
 * literal types to enforce these formats at the type level.
 *
 * Midnight-Spanning Bookings:
 * - When endTime < startTime (e.g., 23:00-02:00), the booking spans midnight
 * - In this case, endDate = startDate + 1 day
 * - For same-day bookings, startDate === endDate
 */
export interface Reservation {
  reservationId: string;
  roomId: string;
  userId: string;
  startDate: string; // ISO date string (YYYY-MM-DD) - when the booking starts
  endDate: string; // ISO date string (YYYY-MM-DD) - when the booking ends (can be next day for midnight-spanning)
  startTime: string; // 24-hour format (HH:MM)
  endTime: string; // 24-hour format (HH:MM)
}

/**
 * User Entity
 * -----------
 * Represents a user who can make reservations.
 * The passwordHash is stored instead of plain text for security.
 */
export interface User {
  userId: string;
  username: string;
  name: string;
  passwordHash: string;
}

/**
 * JWT Token Payload
 * -----------------
 * The data we encode into the JWT token. This is what gets decoded
 * when we verify a token and attach it to the request.
 *
 * TypeScript Concept: Minimal Interface
 * -------------------------------------
 * We only include what's necessary in the token payload. We don't include
 * the passwordHash (security risk) or other data that can be looked up.
 */
export interface TokenPayload {
  userId: string;
  username: string;
}

/**
 * API Response Types
 * ------------------
 * Consistent response shapes for success and error responses.
 *
 * TypeScript Concept: Generic Type Parameter <T>
 * ----------------------------------------------
 * The <T> is a "generic" - it's like a placeholder for a type that will
 * be specified later. When you use ApiResponse<Reservation>, T becomes
 * Reservation, so data would be of type Reservation.
 *
 * Think of it like a function parameter, but for types:
 * - Function: function greet(name) { return `Hello ${name}` }
 * - Generic:  interface Response<T> { data: T }
 */
export interface ApiResponse<T = undefined> {
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Request Body Types
 * ------------------
 * These define what shape the request body should have for various endpoints.
 * Zod will validate these at runtime, but having TypeScript interfaces
 * gives us compile-time type checking too.
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateReservationRequest {
  roomId: string;
  startDate: string; // ISO date string (YYYY-MM-DD) - when the booking starts
  startTime: string; // 24-hour format (HH:MM)
  endTime: string; // 24-hour format (HH:MM)
  // Note: endDate is calculated automatically based on whether booking spans midnight
}

/**
 * TypeScript Concept: Utility Types - Partial<T>
 * ----------------------------------------------
 * Partial<T> makes all properties of T optional. So Partial<Reservation>
 * would be like Reservation but with every field having a ? after it.
 *
 * This is useful for update operations where you might only update some fields.
 * We're not using it here since reservations are replaced entirely, but it's
 * a common pattern you'll see.
 */

/**
 * TypeScript Concept: Type Aliases vs Interfaces
 * ----------------------------------------------
 * You can also define types using 'type' instead of 'interface':
 *
 * type Room = { roomId: string; name: string; }
 *
 * Both are similar, but interfaces can be extended/merged and are generally
 * preferred for object shapes. Types are better for unions, intersections,
 * and more complex type manipulations.
 */
