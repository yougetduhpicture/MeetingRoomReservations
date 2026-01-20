import request from 'supertest';
import { createApp } from '../app';
import { Express } from 'express';

/**
 * TypeScript + Jest Testing
 * -------------------------
 * Supertest allows us to test Express apps without starting a real server.
 * We import the app factory, create a fresh instance for each test suite,
 * and make HTTP requests against it.
 *
 * TypeScript Concept: Test Types
 * ------------------------------
 * @types/jest and @types/supertest provide types for test utilities.
 * The 'describe', 'it', 'expect', 'beforeAll', etc. are globally available.
 */

let app: Express;

// Create fresh app instance before all tests
beforeAll(() => {
  app = createApp();
});

/**
 * Helper function to login and get a token
 * ----------------------------------------
 * Many tests need authentication, so this helper streamlines the process.
 */
async function getAuthToken(
  username: string = 'alice',
  password: string = 'SecurePass123!'
): Promise<string> {
  const response = await request(app)
    .post('/api/login')
    .send({ username, password });

  return response.body.data.token as string;
}

// ==============================================
// AUTHENTICATION TESTS
// ==============================================

describe('Authentication - POST /api/login', () => {
  describe('Successful Login', () => {
    it('should return 200 and JWT token for valid credentials (Alice)', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'alice', password: 'SecurePass123!' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({
        userId: 'user-1',
        username: 'alice',
        name: 'Alice Johnson',
      });
    });

    it('should return 200 and JWT token for valid credentials (Bob)', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'bob', password: 'BobSecure2026!' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.username).toBe('bob');
    });
  });

  describe('Failed Login', () => {
    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'alice', password: 'WrongPassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UnauthorizedError');
      expect(response.body.message).toContain('Invalid username or password');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'nonexistent', password: 'SomePassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UnauthorizedError');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing username', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ password: 'SecurePass123!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'alice' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should return 400 for empty body', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should return 400 for empty username', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: '', password: 'SecurePass123!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });
});

describe('Protected Routes - Authentication Required', () => {
  it('should return 401 when accessing reservations without token', async () => {
    const response = await request(app).post('/api/reservations').send({
      roomId: 'room-1',
      date: '2026-06-15',
      startTime: '10:00',
      endTime: '11:00',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication required');
  });

  it('should return 401 when accessing with invalid token', async () => {
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        roomId: 'room-1',
        date: '2026-06-15',
        startTime: '10:00',
        endTime: '11:00',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Invalid token');
  });

  it('should return 401 for malformed Authorization header', async () => {
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', 'InvalidFormat token')
      .send({
        roomId: 'room-1',
        date: '2026-06-15',
        startTime: '10:00',
        endTime: '11:00',
      });

    expect(response.status).toBe(401);
  });
});

// ==============================================
// RESERVATION CREATION TESTS
// ==============================================

describe('Create Reservation - POST /api/reservations', () => {
  describe('Successful Creation', () => {
    it('should return 201 for valid reservation', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-15',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('created successfully');
      expect(response.body.data).toMatchObject({
        roomId: 'room-1',
        userId: 'user-1',
        date: '2026-06-15',
        startTime: '10:00',
        endTime: '11:00',
      });
      expect(response.body.data).toHaveProperty('reservationId');
    });

    it('should create reservation for different room', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-2',
          date: '2026-06-15',
          startTime: '14:00',
          endTime: '15:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.roomId).toBe('room-2');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for past date/time', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2020-01-15',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('past');
    });

    it('should return 400 for non-hourly time slot', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-15',
          startTime: '09:30',
          endTime: '10:30',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('on the hour');
    });

    it('should return 400 for non-1-hour duration', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-15',
          startTime: '09:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('exactly 1 hour');
    });

    it('should return 400 for invalid time format', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-15',
          startTime: '9:00', // Should be 09:00
          endTime: '10:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('HH:MM format');
    });

    it('should return 400 for invalid date format', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '06-15-2026', // Wrong format
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('YYYY-MM-DD');
    });

    it('should return 400 for missing required fields', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-15',
          // Missing startTime and endTime
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent room', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-999',
          date: '2026-06-15',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Conflict Handling', () => {
    it('should return 409 when different user books same slot', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      // Alice books a slot
      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-20',
          startTime: '10:00',
          endTime: '11:00',
        });

      // Bob tries to book the same slot
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-20',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ConflictError');
      expect(response.body.message).toContain('already booked');
      expect(response.body.message).toContain('Alice Johnson');
    });

    it('should return 200 (update) when same user books overlapping slot', async () => {
      const token = await getAuthToken();

      // Alice books a slot
      const first = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-20',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(first.status).toBe(201);
      const reservationId = first.body.data.reservationId;

      // Alice books the same slot again (should update)
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-20',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
      // Should keep the same reservation ID
      expect(response.body.data.reservationId).toBe(reservationId);
    });

    it('should detect conflict with seed data (Bob tries Alice time)', async () => {
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      // Seed data: res-1 is Alice's reservation for room-1, 2026-06-02, 09:00-10:00
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          date: '2026-06-02',
          startTime: '09:00',
          endTime: '10:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Alice Johnson');
    });
  });
});

// ==============================================
// RESERVATION DELETION TESTS
// ==============================================

describe('Delete Reservation - DELETE /api/reservations/:id', () => {
  describe('Successful Deletion', () => {
    it('should return 204 when user deletes own reservation', async () => {
      const token = await getAuthToken();

      // res-1 belongs to Alice (user-1)
      const response = await request(app)
        .delete('/api/reservations/res-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it('should return 204 when Bob deletes his own reservation', async () => {
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      // res-2 belongs to Bob (user-2)
      const response = await request(app)
        .delete('/api/reservations/res-2')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Authorization Errors', () => {
    it('should return 403 when user tries to delete another user reservation', async () => {
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      // res-1 belongs to Alice, not Bob
      const response = await request(app)
        .delete('/api/reservations/res-1')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('ForbiddenError');
      expect(response.body.message).toContain('cannot cancel');
    });

    it('should return 401 when deleting without authentication', async () => {
      const response = await request(app).delete('/api/reservations/res-1');

      expect(response.status).toBe(401);
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent reservation', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .delete('/api/reservations/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });
});

// ==============================================
// GET RESERVATIONS TESTS
// ==============================================

describe('Get Room Reservations - GET /api/rooms/:roomId/reservations', () => {
  describe('Successful Retrieval', () => {
    it('should return 200 with reservations for valid room', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .get('/api/rooms/room-1/reservations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reservation');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Seed data has 2 reservations for room-1
      expect(response.body.data.length).toBe(2);
    });

    it('should return 200 with empty array for room with no reservations', async () => {
      const token = await getAuthToken();

      // First delete all reservations for room-3
      await request(app)
        .delete('/api/reservations/res-5')
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app)
        .get('/api/rooms/room-3/reservations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return reservations with correct structure', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .get('/api/rooms/room-2/reservations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const reservation = response.body.data[0];
      expect(reservation).toHaveProperty('reservationId');
      expect(reservation).toHaveProperty('roomId');
      expect(reservation).toHaveProperty('userId');
      expect(reservation).toHaveProperty('date');
      expect(reservation).toHaveProperty('startTime');
      expect(reservation).toHaveProperty('endTime');
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent room', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .get('/api/rooms/room-999/reservations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Authentication Errors', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/rooms/room-1/reservations');

      expect(response.status).toBe(401);
    });
  });
});

// ==============================================
// HEALTH CHECK TEST
// ==============================================

describe('Health Check - GET /api/health', () => {
  it('should return 200 with healthy status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data).toHaveProperty('timestamp');
  });
});

// ==============================================
// 404 NOT FOUND TEST
// ==============================================

describe('Not Found Handler', () => {
  it('should return 404 for unknown endpoints', async () => {
    const response = await request(app).get('/api/unknown-endpoint');

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });
});
