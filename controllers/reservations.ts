import { Request, Response, NextFunction } from 'express';
import {
  createNewReservation,
  cancelReservation,
} from '../services/reservationService';
import { CreateReservationInput } from '../validators/reservationValidator';
import { UnauthorizedError } from '../errors/ApiError';

/**
 * Reservations Controller
 * -----------------------
 * Handles reservation-related HTTP endpoints.
 *
 * Each handler is thin (5-15 lines) because:
 * - Validation happens in middleware (Zod)
 * - Business logic happens in services
 * - Error handling happens in error middleware
 */

/**
 * Create Reservation Handler
 * --------------------------
 * POST /api/reservations
 *
 * TypeScript Concept: Non-null Assertion (!)
 * ------------------------------------------
 * After our auth middleware runs, req.user is definitely set.
 * But TypeScript doesn't know this - it still sees req.user as
 * 'TokenPayload | undefined'.
 *
 * The '!' operator (non-null assertion) tells TypeScript "trust me,
 * this isn't null/undefined". Use sparingly and only when you're certain.
 *
 * Alternatively, you could check: if (!req.user) throw new Error();
 */
export async function createReservationController(
  req: Request<object, object, CreateReservationInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Auth middleware ensures req.user exists on protected routes
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { roomId, startDate, startTime, endTime } = req.body;
    const userId = req.user.userId;

    const result = await createNewReservation(
      { roomId, startDate, startTime, endTime },
      userId
    );

    // Different status and message based on whether we created or updated
    if (result.wasUpdated) {
      res.status(200).json({
        message: 'Your existing reservation has been updated to the new time slot',
        data: result.reservation,
      });
    } else {
      res.status(201).json({
        message: 'Reservation created successfully',
        data: result.reservation,
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Delete Reservation Handler
 * --------------------------
 * DELETE /api/reservations/:id
 *
 * TypeScript Concept: Typed URL Parameters
 * ----------------------------------------
 * Request<{ id: string }> tells TypeScript that req.params.id exists
 * and is a string. This gives you autocompletion and type checking.
 */
export async function deleteReservationController(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;
    const userId = req.user.userId;

    await cancelReservation(id, userId);

    // 204 No Content - successful deletion with no response body
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
