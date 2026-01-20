import { Request, Response, NextFunction } from 'express';
import { getRoomReservations } from '../services/reservationService';
import { UnauthorizedError } from '../errors/ApiError';

/**
 * Rooms Controller
 * ----------------
 * Handles room-related HTTP endpoints.
 */

/**
 * Get Room Reservations Handler
 * -----------------------------
 * GET /api/rooms/:roomId/reservations
 *
 * Returns all reservations for a specific room.
 */
export async function getRoomReservationsController(
  req: Request<{ roomId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { roomId } = req.params;

    const reservations = await getRoomReservations(roomId);

    res.status(200).json({
      message: `Retrieved ${reservations.length} reservation(s) for room '${roomId}'`,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
}
