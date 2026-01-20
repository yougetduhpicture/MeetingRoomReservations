/**
 * Jest Test Setup
 * ----------------
 * This file runs before each test file.
 * It sets up the test environment and provides utilities.
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '3600';

// Import reset functions
import { resetRooms } from '../models/room';
import { resetUsers } from '../models/user';
import { resetReservations } from '../models/reservation';

/**
 * Reset all data before each test
 * --------------------------------
 * This ensures each test starts with a clean slate.
 */
beforeEach(() => {
  resetRooms();
  resetUsers();
  resetReservations();
});

/**
 * TypeScript Concept: Jest Types
 * ------------------------------
 * @types/jest provides types for describe, it, expect, beforeEach, etc.
 * These are globally available in test files without importing.
 */
