import { createApp } from './app';
import config from './utils/config';
import logger from './utils/logger';

/**
 * Server Entry Point
 * ------------------
 * This file is the entry point for the application. It:
 * 1. Creates the Express app
 * 2. Starts listening on the configured port
 * 3. Logs startup information
 *
 * Why Separate from app.ts?
 * -------------------------
 * - app.ts exports the app for testing (without starting a server)
 * - index.ts actually starts the server
 * - This separation allows Supertest to import the app without
 *   starting a real HTTP server
 */

const app = createApp();

app.listen(config.PORT, () => {
  logger.info(`Server started`, {
    port: config.PORT,
    environment: config.NODE_ENV,
  });

  logger.info('Available endpoints:', {
    login: 'POST /api/login',
    createReservation: 'POST /api/reservations',
    deleteReservation: 'DELETE /api/reservations/:id',
    getRoomReservations: 'GET /api/rooms/:roomId/reservations',
    healthCheck: 'GET /api/health',
  });

  if (config.NODE_ENV === 'development') {
    logger.info('Test credentials:', {
      alice: { username: 'alice', password: 'SecurePass123!' },
      bob: { username: 'bob', password: 'BobSecure2026!' },
    });
  }
});

/**
 * TypeScript Concept: Process Event Handlers
 * ------------------------------------------
 * These handlers catch unhandled errors and rejections at the process level.
 * Without them, the Node.js process might crash silently.
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});
