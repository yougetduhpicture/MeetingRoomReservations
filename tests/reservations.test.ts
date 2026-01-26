import request from 'supertest';
import { createApp } from '../app';
import { Express } from 'express';

let app: Express;

beforeAll(() => {
  app = createApp();
});

async function getAuthToken(
  username: string = 'alice',
  password: string = 'SecurePass123!'
): Promise<string> {
  const response = await request(app)
    .post('/api/login')
    .send({ username, password });

  return response.body.data.token as string;
}

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
      startDate: '2026-06-15',
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
        startDate: '2026-06-15',
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
        startDate: '2026-06-15',
        startTime: '10:00',
        endTime: '11:00',
      });

    expect(response.status).toBe(401);
  });
});

describe('Create Reservation - POST /api/reservations', () => {
  describe('Successful Creation', () => {
    it('should return 201 for valid reservation', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-15',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('created successfully');
      expect(response.body.data).toMatchObject({
        roomId: 'room-1',
        userId: 'user-1',
        startDate: '2026-06-15',
        endDate: '2026-06-15',
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
          startDate: '2026-06-15',
          startTime: '14:00',
          endTime: '15:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.roomId).toBe('room-2');
    });

    it('should create reservation with flexible duration (2.5 hours)', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-16',
          startTime: '09:30',
          endTime: '12:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        startTime: '09:30',
        endTime: '12:00',
      });
    });

    it('should create reservation with non-hourly times (14:15 to 16:45)', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-17',
          startTime: '14:15',
          endTime: '16:45',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.startTime).toBe('14:15');
      expect(response.body.data.endTime).toBe('16:45');
    });

    it('should create midnight-spanning reservation (23:00 to 02:00)', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-3',
          startDate: '2026-06-18',
          startTime: '23:00',
          endTime: '02:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        startDate: '2026-06-18',
        endDate: '2026-06-19',
        startTime: '23:00',
        endTime: '02:00',
      });
    });

    it('should create minimum duration reservation (30 minutes)', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-19',
          startTime: '10:00',
          endTime: '10:30',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.startTime).toBe('10:00');
      expect(response.body.data.endTime).toBe('10:30');
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
          startDate: '2020-01-15',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('past');
    });

    it('should return 400 for invalid time format', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-15',
          startTime: '9:00',
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
          startDate: '06-15-2026',
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
          startDate: '2026-06-15',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should return 400 for booking less than 30 minutes', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-15',
          startTime: '10:00',
          endTime: '10:15',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('30 minutes');
    });

    it('should return 400 for booking exceeding 12 hours', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-15',
          startTime: '08:00',
          endTime: '21:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('12 hours');
    });

    it('should return 400 when start time equals end time', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-15',
          startTime: '10:00',
          endTime: '10:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot be the same');
    });

    it('should return 400 for midnight-spanning booking exceeding 12 hours', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-15',
          startTime: '10:00',
          endTime: '09:00',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('12 hours');
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
          startDate: '2026-06-15',
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

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-20',
          startTime: '10:00',
          endTime: '11:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-20',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ConflictError');
      expect(response.body.message).toContain('already booked');
      expect(response.body.message).toContain('Alice Johnson');
    });

    it('should return 409 when bookings partially overlap', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-21',
          startTime: '10:00',
          endTime: '12:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-21',
          startTime: '11:00',
          endTime: '13:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ConflictError');
    });

    it('should return 409 when new booking is contained within existing', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-22',
          startTime: '09:00',
          endTime: '17:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-22',
          startTime: '12:00',
          endTime: '13:00',
        });

      expect(response.status).toBe(409);
    });

    it('should return 200 (update) when same user books overlapping slot', async () => {
      const token = await getAuthToken();

      const first = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-23',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(first.status).toBe(201);
      const reservationId = first.body.data.reservationId;

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-23',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
      expect(response.body.data.reservationId).toBe(reservationId);
    });

    it('should detect conflict with seed data (Bob tries Alice time)', async () => {
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-02',
          startTime: '09:00',
          endTime: '10:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Alice Johnson');
    });

    it('should include nearest available time slots in conflict message', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-25',
          startTime: '10:00',
          endTime: '11:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-25',
          startTime: '10:00',
          endTime: '11:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Nearest available slot');
    });

    it('should detect conflict between same-day and midnight-spanning bookings', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-3',
          startDate: '2026-06-26',
          startTime: '23:00',
          endTime: '02:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-3',
          startDate: '2026-06-27',
          startTime: '01:00',
          endTime: '03:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ConflictError');
    });

    it('should detect conflict between two midnight-spanning bookings', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-3',
          startDate: '2026-06-28',
          startTime: '22:00',
          endTime: '01:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-3',
          startDate: '2026-06-28',
          startTime: '23:30',
          endTime: '02:00',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ConflictError');
    });

    it('should allow adjacent bookings without conflict', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-29',
          startTime: '10:00',
          endTime: '12:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-1',
          startDate: '2026-06-29',
          startTime: '12:00',
          endTime: '14:00',
        });

      expect(response.status).toBe(201);
    });

    it('should allow booking after midnight-spanning booking ends', async () => {
      const aliceToken = await getAuthToken('alice', 'SecurePass123!');
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          roomId: 'room-3',
          startDate: '2026-06-30',
          startTime: '23:00',
          endTime: '02:00',
        });

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          roomId: 'room-3',
          startDate: '2026-07-01',
          startTime: '02:00',
          endTime: '04:00',
        });

      expect(response.status).toBe(201);
    });
  });
});

describe('Delete Reservation - DELETE /api/reservations/:id', () => {
  describe('Successful Deletion', () => {
    it('should return 204 when user deletes own reservation', async () => {
      const token = await getAuthToken();

      const response = await request(app)
        .delete('/api/reservations/res-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it('should return 204 when Bob deletes his own reservation', async () => {
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

      const response = await request(app)
        .delete('/api/reservations/res-2')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Authorization Errors', () => {
    it('should return 403 when user tries to delete another user reservation', async () => {
      const bobToken = await getAuthToken('bob', 'BobSecure2026!');

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
      expect(response.body.data.length).toBe(2);
    });

    it('should return 200 with empty array for room with no reservations', async () => {
      const token = await getAuthToken();

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
      expect(reservation).toHaveProperty('startDate');
      expect(reservation).toHaveProperty('endDate');
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

describe('Health Check - GET /api/health', () => {
  it('should return 200 with healthy status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data).toHaveProperty('timestamp');
  });
});

describe('Not Found Handler', () => {
  it('should return 404 for unknown endpoints', async () => {
    const response = await request(app).get('/api/unknown-endpoint');

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });
});
