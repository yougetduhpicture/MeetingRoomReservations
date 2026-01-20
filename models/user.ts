import bcrypt from 'bcrypt';
import { User } from '../types';

/**
 * In-Memory User Storage
 * ----------------------
 * Password hashes are generated using bcrypt with a cost factor of 10.
 *
 * IMPORTANT: In a real app, you'd NEVER commit password hashes to code.
 * These are here for demo/testing purposes only.
 *
 * Test Credentials:
 * - alice / SecurePass123!
 * - bob / BobSecure2026!
 */

/**
 * TypeScript Concept: Synchronous vs Async Initialization
 * -------------------------------------------------------
 * bcrypt.hashSync() is the synchronous version of hash(). We use it here
 * because we need the hashes immediately when the module loads.
 *
 * In production code, you'd typically use the async version in an
 * initialization function to avoid blocking the event loop.
 */
const SALT_ROUNDS = 10;

const users: User[] = [
  {
    userId: 'user-1',
    username: 'alice',
    name: 'Alice Johnson',
    passwordHash: bcrypt.hashSync('SecurePass123!', SALT_ROUNDS),
  },
  {
    userId: 'user-2',
    username: 'bob',
    name: 'Bob Smith',
    passwordHash: bcrypt.hashSync('BobSecure2026!', SALT_ROUNDS),
  },
];

/**
 * User Model Functions
 * --------------------
 */

/**
 * Find a user by username
 */
export function findUserByUsername(username: string): User | undefined {
  return users.find((user) => user.username === username);
}

/**
 * Find a user by ID
 */
export function findUserById(userId: string): User | undefined {
  return users.find((user) => user.userId === userId);
}

/**
 * Verify a password against a hash
 *
 * TypeScript Concept: Promise Return Types
 * ----------------------------------------
 * 'Promise<boolean>' means this function returns a Promise that will
 * resolve to a boolean. This is the async equivalent of 'boolean'.
 *
 * You'd call it with: const isValid = await verifyPassword(...)
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a user exists
 */
export function userExists(userId: string): boolean {
  return users.some((user) => user.userId === userId);
}

/**
 * Get all users (without password hashes)
 *
 * TypeScript Concept: Omit Utility Type
 * -------------------------------------
 * Omit<User, 'passwordHash'> creates a new type that has all properties
 * of User EXCEPT 'passwordHash'. This is useful for creating "safe"
 * versions of types that exclude sensitive data.
 */
export function getAllUsers(): Omit<User, 'passwordHash'>[] {
  return users.map(({ passwordHash: _, ...user }) => user);
}

/**
 * Reset users to initial state (useful for testing)
 */
export function resetUsers(): void {
  users.length = 0;
  users.push(
    {
      userId: 'user-1',
      username: 'alice',
      name: 'Alice Johnson',
      passwordHash: bcrypt.hashSync('SecurePass123!', SALT_ROUNDS),
    },
    {
      userId: 'user-2',
      username: 'bob',
      name: 'Bob Smith',
      passwordHash: bcrypt.hashSync('BobSecure2026!', SALT_ROUNDS),
    }
  );
}
