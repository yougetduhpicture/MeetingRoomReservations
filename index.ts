import { createApp } from './app';
import config from './utils/config';
import logger from './utils/logger';

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
