import { Request, Response, NextFunction } from 'express';
import {
  createNewReservation,
  cancelReservation,
} from '../services/reservationService';
import { CreateReservationInput } from '../validators/reservationValidator';
import { UnauthorizedError } from '../errors/ApiError';

export async function createReservationController(
  req: Request<object, object, CreateReservationInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { roomId, startDate, startTime, endTime } = req.body;
    const userId = req.user.userId;

    const result = await createNewReservation(
      { roomId, startDate, startTime, endTime },
      userId
    );

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

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
