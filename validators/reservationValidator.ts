import { z } from 'zod';

/**
 * TypeScript Concept: Runtime vs Compile-Time Validation
 * ------------------------------------------------------
 * TypeScript interfaces only exist at compile time - they disappear when
 * your code runs. They can't validate data coming from external sources
 * (API requests, databases, etc.) at runtime.
 *
 * Zod fills this gap: it validates data at runtime AND can infer TypeScript
 * types from schemas. This gives you:
 * - Runtime validation (catches bad data when your app runs)
 * - Type inference (TypeScript knows the validated data's shape)
 * - User-friendly error messages
 *
 * Why Zod over alternatives?
 * - TypeScript-first design
 * - Zero dependencies
 * - Excellent type inference
 * - Composable schemas
 */

/**
 * Login Schema
 * ------------
 * Validates the login request body.
 *
 * z.object() defines an object schema
 * z.string() defines a string field
 * .min(1) ensures the string isn't empty
 */
export const loginSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string',
    })
    .min(1, 'Username cannot be empty'),

  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(1, 'Password cannot be empty'),
});

/**
 * TypeScript Concept: Type Inference from Zod Schemas
 * ---------------------------------------------------
 * z.infer<typeof schema> extracts the TypeScript type from a Zod schema.
 * This means you define your validation ONCE and get the type for free.
 *
 * The 'typeof' operator here gets the type of the schema variable,
 * and z.infer extracts what shape data would have after validation.
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Time Format Regex
 * -----------------
 * Matches 24-hour time format: HH:MM
 * Examples: 09:00, 13:30, 23:59
 */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Date Format Regex
 * -----------------
 * Matches ISO date format: YYYY-MM-DD
 * Examples: 2026-06-15, 2026-12-31
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Create Reservation Schema
 * -------------------------
 * Validates the request body for creating a reservation.
 *
 * Zod Concept: Custom Validation with .refine()
 * ---------------------------------------------
 * .refine() lets you add custom validation logic that goes beyond
 * simple type checking. It takes a function that returns true if
 * valid, false if invalid.
 */
export const createReservationSchema = z
  .object({
    roomId: z
      .string({
        required_error: 'Room ID is required',
        invalid_type_error: 'Room ID must be a string',
      })
      .min(1, 'Room ID cannot be empty'),

    date: z
      .string({
        required_error: 'Date is required',
        invalid_type_error: 'Date must be a string',
      })
      .regex(dateRegex, 'Date must be in YYYY-MM-DD format'),

    startTime: z
      .string({
        required_error: 'Start time is required',
        invalid_type_error: 'Start time must be a string',
      })
      .regex(timeRegex, 'Start time must be in HH:MM format (24-hour)'),

    endTime: z
      .string({
        required_error: 'End time is required',
        invalid_type_error: 'End time must be a string',
      })
      .regex(timeRegex, 'End time must be in HH:MM format (24-hour)'),
  })
  /**
   * Zod Concept: Object-Level Refinements with .refine()
   * ----------------------------------------------------
   * When you chain .refine() after z.object(), you get access to the
   * entire object, allowing cross-field validation.
   */
  .refine(
    (data) => {
      // Validate that times are on the hour (e.g., 09:00, not 09:30)
      const startMinutes = data.startTime.split(':')[1];
      const endMinutes = data.endTime.split(':')[1];
      return startMinutes === '00' && endMinutes === '00';
    },
    {
      message: 'Reservations must start and end on the hour (e.g., 09:00, 14:00)',
      path: ['startTime'], // Which field to attach the error to
    }
  )
  .refine(
    (data) => {
      // Validate exactly 1 hour duration
      const startHour = parseInt(data.startTime.split(':')[0], 10);
      const endHour = parseInt(data.endTime.split(':')[0], 10);
      return endHour - startHour === 1;
    },
    {
      message: 'Reservations must be exactly 1 hour long',
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      // Validate that the date is valid (not just format, but actual date)
      const date = new Date(data.date);
      return !isNaN(date.getTime());
    },
    {
      message: 'Invalid date',
      path: ['date'],
    }
  );

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

/**
 * Room ID Parameter Schema
 * ------------------------
 * For validating URL parameters like /rooms/:roomId
 */
export const roomIdSchema = z.object({
  roomId: z
    .string({
      required_error: 'Room ID is required',
    })
    .min(1, 'Room ID cannot be empty'),
});

/**
 * Reservation ID Parameter Schema
 * -------------------------------
 * For validating URL parameters like /reservations/:id
 */
export const reservationIdSchema = z.object({
  id: z
    .string({
      required_error: 'Reservation ID is required',
    })
    .min(1, 'Reservation ID cannot be empty'),
});

/**
 * Zod Concept: Formatting Errors for Users
 * ----------------------------------------
 * Zod errors can be complex nested structures. This helper function
 * extracts user-friendly messages from validation errors.
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    // If there's a path, include it in the message
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
}

/**
 * Helper function to get the first error message
 * ----------------------------------------------
 * Often you just want to show one error at a time to the user.
 */
export function getFirstZodError(error: z.ZodError): string {
  const messages = formatZodErrors(error);
  return messages[0] || 'Validation failed';
}
