# Meeting Room Reservation API

A production-ready TypeScript + Express REST API for managing meeting room reservations. Built to demonstrate clean architecture, comprehensive testing, and professional development practices.

## Project Overview

This API provides endpoints for:
- User authentication with JWT tokens
- Creating and managing meeting room reservations
- Flexible booking durations (30 minutes to 12 hours) with minute precision
- Midnight-spanning bookings (e.g., 23:00-02:00)
- Conflict detection with intelligent suggestions for available time slots
- Role-based access control (users can only modify their own reservations)

### Key Features

- **TypeScript** - Full type safety with strict mode enabled
- **Layered Architecture** - Clean separation of concerns (Controller → Service → Model)
- **Input Validation** - Runtime validation with Zod, providing type inference
- **Custom Error Handling** - User-friendly error messages with consistent response format
- **Comprehensive Testing** - 30+ integration tests with Jest and Supertest
- **Code Quality** - ESLint + Prettier for consistent, clean code

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTP Request                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Middleware Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Logger    │  │  Auth (JWT) │  │  Validation (Zod)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Controller Layer                             │
│  • Handles HTTP request/response                                 │
│  • Calls service methods                                         │
│  • Returns appropriate status codes                              │
│  • Thin (5-15 lines per endpoint)                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  • Contains business logic                                       │
│  • Validates business rules                                      │
│  • Throws custom errors                                          │
│  • Testable independently                                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Model Layer                                │
│  • Data structures and storage                                   │
│  • CRUD operations                                               │
│  • No business logic                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

1. **Testability** - Business logic can be tested without HTTP layer
2. **Maintainability** - Changes to one layer don't affect others
3. **Scalability** - Easy to swap data storage (e.g., add a database)
4. **Readability** - Clear separation makes code easier to understand

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| TypeScript | 5.5 | Type-safe JavaScript |
| Express | 4.21 | Web framework |
| Zod | 3.23 | Runtime validation with type inference |
| JWT | 9.0 | Authentication tokens |
| bcrypt | 5.1 | Password hashing |
| Jest | 29.7 | Testing framework |
| Supertest | 7.0 | HTTP testing |
| ESLint | 8.57 | Code linting |
| Prettier | 3.3 | Code formatting |

## File Structure

```
├── controllers/           # HTTP request handlers (thin layer)
│   ├── login.ts          # Authentication endpoint
│   ├── reservations.ts   # Reservation CRUD endpoints
│   └── rooms.ts          # Room-related endpoints
├── services/             # Business logic layer
│   ├── authService.ts    # Authentication logic
│   └── reservationService.ts # Reservation business rules
├── models/               # Data storage and CRUD operations
│   ├── reservation.ts    # Reservation data + seed data
│   ├── room.ts           # Room data + seed data
│   └── user.ts           # User data + password verification
├── validators/           # Zod validation schemas
│   └── reservationValidator.ts
├── types/                # TypeScript type definitions
│   ├── express.d.ts      # Extended Express Request type
│   └── index.ts          # Shared interfaces
├── errors/               # Custom error classes
│   └── ApiError.ts       # ApiError, NotFoundError, etc.
├── utils/                # Utility modules
│   ├── config.ts         # Environment configuration
│   ├── logger.ts         # Logging utility
│   └── middleware.ts     # Express middleware
├── tests/                # Jest test files
│   ├── setup.ts          # Test configuration
│   └── reservations.test.ts # Integration tests
├── requests/             # REST Client test files
│   ├── login.rest
│   ├── create_reservation.rest
│   ├── update_reservation.rest
│   ├── delete_reservation.rest
│   └── get_reservations.rest
├── app.ts                # Express app factory
├── index.ts              # Server entry point
└── [config files]        # tsconfig, eslint, prettier, etc.
```

## Setup Instructions

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MeetingRoomReservations
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` if you want to change defaults:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=3600
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

### Production Build

```bash
npm run build    # Compiles TypeScript to JavaScript
npm start        # Runs the compiled code
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

---

### POST /api/login

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "username": "alice",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "user-1",
      "username": "alice",
      "name": "Alice Johnson"
    }
  }
}
```

**Error Responses:**
- `400` - Validation error (missing fields)
- `401` - Invalid credentials

---

### POST /api/reservations

Create a new reservation. Requires authentication.

**Request Body:**
```json
{
  "roomId": "room-1",
  "startDate": "2026-06-15",
  "startTime": "10:00",
  "endTime": "11:30"
}
```

**Validation Rules:**
- Start date must be in the future (YYYY-MM-DD format)
- Times must be in HH:MM format (24-hour, minute precision)
- Duration must be between 30 minutes and 12 hours
- Midnight-spanning bookings are supported (e.g., 23:00-02:00)
- Room must exist

**Success Response (201):**
```json
{
  "message": "Reservation created successfully",
  "data": {
    "reservationId": "abc-123-def",
    "roomId": "room-1",
    "userId": "user-1",
    "startDate": "2026-06-15",
    "endDate": "2026-06-15",
    "startTime": "10:00",
    "endTime": "11:30"
  }
}
```

**Special Behavior - Same User Overlap:**

If you try to book a slot that overlaps with your own existing reservation, the API will **update** your existing reservation instead of creating a conflict:

```json
{
  "message": "Your existing reservation has been updated to the new time slot",
  "data": { ... }
}
```

**Error Responses:**
- `400` - Validation error (invalid format, past date, duration out of range)
- `401` - Not authenticated
- `404` - Room not found
- `409` - Conflict (slot booked by another user)

**Conflict Response (409):**

When a conflict occurs, the API suggests alternative available time slots:
```json
{
  "error": "ConflictError",
  "message": "Conference Room A is already booked from 10:00-11:00 on 2026-06-15 by Alice Johnson. Nearest available slots: 08:30-10:00 (earlier) or 11:00-12:30 (later).",
  "statusCode": 409
}
```

---

### DELETE /api/reservations/:id

Cancel a reservation. Users can only delete their own reservations.

**Success Response (204):** No content

**Error Responses:**
- `401` - Not authenticated
- `403` - Forbidden (not your reservation)
- `404` - Reservation not found

---

### GET /api/rooms/:roomId/reservations

Get all reservations for a specific room.

**Success Response (200):**
```json
{
  "message": "Retrieved 2 reservation(s) for room 'room-1'",
  "data": [
    {
      "reservationId": "res-1",
      "roomId": "room-1",
      "userId": "user-1",
      "startDate": "2026-06-02",
      "endDate": "2026-06-02",
      "startTime": "09:00",
      "endTime": "10:30"
    }
  ]
}
```

**Error Responses:**
- `401` - Not authenticated
- `404` - Room not found

---

### GET /api/health

Health check endpoint (no authentication required).

**Success Response (200):**
```json
{
  "message": "API is running",
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-20T12:00:00.000Z"
  }
}
```

## Test Credentials

| Username | Password | User ID |
|----------|----------|---------|
| alice | SecurePass123! | user-1 |
| bob | BobSecure2026! | user-2 |

## Available Rooms

| Room ID | Name |
|---------|------|
| room-1 | Conference Room A |
| room-2 | Meeting Room B |
| room-3 | Huddle Space C |

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Coverage

The test suite includes 30+ tests covering:
- Authentication (login success, failure, validation)
- Protected routes (token verification)
- Reservation creation (success, validation, conflicts)
- Reservation deletion (ownership, authorization)
- Room reservation queries
- Error handling (404, validation errors)

### Using REST Client Files

Install the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) for VS Code, then:

1. Open any `.rest` file in the `requests/` folder
2. Run the login request first to get a token
3. Copy the token to the `@token` variable
4. Run other requests

## Code Quality

### Linting
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### Formatting
```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

### TypeScript Strict Mode

The project uses TypeScript's strict mode with additional checks:
- `noImplicitAny` - No implicit any types
- `strictNullChecks` - Null/undefined must be handled
- `noUnusedLocals` - No unused variables
- `noUnusedParameters` - No unused function parameters

## Project Decisions & Trade-offs

### In-Memory Database
**Decision:** Use arrays for data storage instead of a real database.

**Reasoning:**
- Simplifies setup for demonstration purposes
- No external dependencies required
- Focus on API design and architecture
- Easy to understand and review

**Trade-off:** Data resets when server restarts.

### Layered Architecture
**Decision:** Separate controllers, services, and models.

**Reasoning:**
- Industry-standard pattern for enterprise applications
- Enables unit testing of business logic
- Clear separation of concerns
- Easy to extend or swap components

**Trade-off:** More files and boilerplate for a small project.

### Zod for Validation
**Decision:** Use Zod instead of Joi, Yup, or manual validation.

**Reasoning:**
- TypeScript-first design
- Automatic type inference from schemas
- Modern, well-maintained library
- Excellent error messages

### JWT Authentication
**Decision:** Stateless JWT tokens instead of sessions.

**Reasoning:**
- Standard for REST APIs
- Scalable (no server-side session storage)
- Works well with in-memory database approach

### Same-User Overlap as Update
**Decision:** When a user books a slot that overlaps with their own reservation, update instead of error.

**Reasoning:**
- Better user experience
- Allows easy rescheduling
- Prevents confusion about "conflicting with yourself"

## Future Enhancements

- [ ] **Real Database** - PostgreSQL or MongoDB for persistence
- [ ] **User Registration** - Allow new users to sign up
- [ ] **Admin Role** - Manage rooms, view all reservations
- [ ] **Recurring Reservations** - Weekly/monthly bookings
- [ ] **Email Notifications** - Confirmation and reminders
- [ ] **Cancellation Deadlines** - Prevent last-minute cancellations
- [ ] **Pagination** - For large result sets
- [ ] **Rate Limiting** - Prevent API abuse
- [ ] **OpenAPI/Swagger** - Interactive API documentation
- [ ] **Docker** - Containerization for deployment

## Known Limitations

1. **Data Persistence** - In-memory storage resets on server restart
2. **Single Instance** - Not designed for horizontal scaling without a database
3. **No User Registration** - Only seeded users can authenticate
4. **UTC Only** - No timezone handling (all times assumed UTC)

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code for issues |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## License

ISC
