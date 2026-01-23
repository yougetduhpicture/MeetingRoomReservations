import express, { Express } from 'express';
import cors from 'cors';

// Middleware
import {
  authenticate,
  validate,
  errorHandler,
  requestLogger,
  notFoundHandler,
} from './utils/middleware';

// Validators
import {
  loginSchema,
  createReservationSchema,
  reservationIdSchema,
  roomIdSchema,
} from './validators/reservationValidator';

// Controllers
import { loginController } from './controllers/login';
import {
  createReservationController,
  deleteReservationController,
} from './controllers/reservations';
import { getRoomReservationsController } from './controllers/rooms';

/**
 * Express Application Factory
 * ---------------------------
 * This function creates and configures the Express application.
 *
 * Why a Factory Function?
 * -----------------------
 * 1. Testing: We can create fresh app instances for each test
 * 2. Configuration: We can pass different configs for different environments
 * 3. Separation: Keeps app setup separate from server startup
 *
 * TypeScript Concept: Function Return Types
 * -----------------------------------------
 * ': Express' declares that this function returns an Express app instance.
 * This helps with IDE autocompletion and catches mistakes.
 */
export function createApp(): Express {
  const app = express();

  // ---------------------
  // Global Middleware
  // ---------------------

  // Parse JSON request bodies
  app.use(express.json());

  // Enable CORS for all origins (configure appropriately in production)
  app.use(cors());

  // Log all incoming requests
  app.use(requestLogger);

  // ---------------------
  // Public Routes
  // ---------------------

  /**
   * Health Check Endpoint
   * ---------------------
   * Useful for load balancers and monitoring systems.
   */
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      message: 'API is running',
      data: { status: 'healthy', timestamp: new Date().toISOString() },
    });
  });

  /**
   * Login Endpoint
   * --------------
   * POST /api/login
   * Body: { username: string, password: string }
   * Returns: { message, data: { token, user } }
   *
   * TypeScript Concept: Middleware Chain Types
   * ------------------------------------------
   * Express middleware can be chained. Each middleware processes the
   * request and either responds or calls next() to continue.
   *
   * validate(loginSchema) returns a middleware function that validates
   * req.body against the loginSchema, then calls next() if valid.
   */
  app.post('/api/login', validate(loginSchema), loginController);

  // ---------------------
  // Protected Routes
  // ---------------------
  // All routes below require authentication

  /**
   * Create Reservation
   * ------------------
   * POST /api/reservations
   * Headers: Authorization: Bearer <token>
   * Body: { roomId, startDate, startTime, endTime }
   *
   * Supports flexible durations (30min to 12hr) and midnight-spanning bookings.
   * endDate is calculated automatically based on whether booking spans midnight.
   */
  app.post(
    '/api/reservations',
    authenticate,
    validate(createReservationSchema),
    createReservationController
  );

  /**
   * Delete Reservation
   * ------------------
   * DELETE /api/reservations/:id
   * Headers: Authorization: Bearer <token>
   */
  app.delete(
    '/api/reservations/:id',
    authenticate,
    validate(reservationIdSchema, 'params'),
    deleteReservationController
  );

  /**
   * Get Room Reservations
   * ---------------------
   * GET /api/rooms/:roomId/reservations
   * Headers: Authorization: Bearer <token>
   */
  app.get(
    '/api/rooms/:roomId/reservations',
    authenticate,
    validate(roomIdSchema, 'params'),
    getRoomReservationsController
  );

  // ---------------------
  // Error Handling
  // ---------------------

  // Catch requests to non-existent routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
