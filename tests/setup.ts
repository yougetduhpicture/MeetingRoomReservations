process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '3600';

import { resetRooms } from '../models/room';
import { resetUsers } from '../models/user';
import { resetReservations } from '../models/reservation';

beforeEach(() => {
  resetRooms();
  resetUsers();
  resetReservations();
});
