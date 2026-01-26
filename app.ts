import express, { Express } from 'express';
import cors from 'cors';

import {
  authenticate,
  validate,
  errorHandler,
  requestLogger,
  notFoundHandler,
} from './utils/middleware';

import {
  loginSchema,
  createReservationSchema,
  reservationIdSchema,
  roomIdSchema,
} from './validators/reservationValidator';

import { loginController } from './controllers/login';
import {
  createReservationController,
  deleteReservationController,
} from './controllers/reservations';
import { getRoomReservationsController } from './controllers/rooms';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(cors());
  app.use(requestLogger);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      message: 'API is running',
      data: { status: 'healthy', timestamp: new Date().toISOString() },
    });
  });

  app.post('/api/login', validate(loginSchema), loginController);

  app.post(
    '/api/reservations',
    authenticate,
    validate(createReservationSchema),
    createReservationController
  );

  app.delete(
    '/api/reservations/:id',
    authenticate,
    validate(reservationIdSchema, 'params'),
    deleteReservationController
  );

  app.get(
    '/api/rooms/:roomId/reservations',
    authenticate,
    validate(roomIdSchema, 'params'),
    getRoomReservationsController
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
