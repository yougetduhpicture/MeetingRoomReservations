import { z } from 'zod';

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

export type LoginInput = z.infer<typeof loginSchema>;

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BOOKING_DURATION_HOURS = 12;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
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

export const createReservationSchema = z
  .object({
    roomId: z
      .string({
        required_error: 'Room ID is required',
        invalid_type_error: 'Room ID must be a string',
      })
      .min(1, 'Room ID cannot be empty'),

    startDate: z
      .string({
        required_error: 'Start date is required',
        invalid_type_error: 'Start date must be a string',
      })
      .regex(dateRegex, 'Start date must be in YYYY-MM-DD format'),

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
  .refine(
    (data) => {
      const date = new Date(data.startDate);
      return !isNaN(date.getTime());
    },
    {
      message: 'Invalid start date',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      return data.startTime !== data.endTime;
    },
    {
      message: 'Start time and end time cannot be the same',
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      const durationMinutes = calculateDurationMinutes(data.startTime, data.endTime);
      const maxDurationMinutes = MAX_BOOKING_DURATION_HOURS * 60;
      return durationMinutes <= maxDurationMinutes;
    },
    {
      message: `Booking duration cannot exceed ${MAX_BOOKING_DURATION_HOURS} hours`,
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      const durationMinutes = calculateDurationMinutes(data.startTime, data.endTime);
      return durationMinutes >= 30;
    },
    {
      message: 'Booking must be at least 30 minutes long',
      path: ['endTime'],
    }
  );

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const roomIdSchema = z.object({
  roomId: z
    .string({
      required_error: 'Room ID is required',
    })
    .min(1, 'Room ID cannot be empty'),
});

export const reservationIdSchema = z.object({
  id: z
    .string({
      required_error: 'Reservation ID is required',
    })
    .min(1, 'Reservation ID cannot be empty'),
});

export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
}

export function getFirstZodError(error: z.ZodError): string {
  const messages = formatZodErrors(error);
  return messages[0] || 'Validation failed';
}
