import jwt from 'jsonwebtoken';
import config from '../utils/config';
import logger from '../utils/logger';
import { TokenPayload } from '../types';
import { findUserByUsername, verifyPassword } from '../models/user';
import { UnauthorizedError } from '../errors/ApiError';

/**
 * Authentication Service
 * ----------------------
 * Handles user authentication and JWT token generation.
 * This service contains all auth-related business logic.
 */

/**
 * Login Result Interface
 * ----------------------
 * Defines what the login function returns on success.
 */
interface LoginResult {
  token: string;
  user: {
    userId: string;
    username: string;
    name: string;
  };
}

/**
 * Authenticate a user and generate a JWT token
 *
 * TypeScript Concept: Async Functions with Typed Returns
 * ------------------------------------------------------
 * 'async' functions always return a Promise. The return type
 * Promise<LoginResult> means the resolved value will be a LoginResult.
 *
 * If the function throws, the Promise rejects instead of resolving.
 */
export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  logger.debug('Login attempt', { username });

  // Find user by username
  const user = findUserByUsername(username);

  if (!user) {
    // User not found - use generic message to avoid username enumeration
    logger.debug('Login failed - user not found', { username });
    throw new UnauthorizedError(
      'Invalid username or password. Please check your credentials and try again.'
    );
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    logger.debug('Login failed - invalid password', { username });
    throw new UnauthorizedError(
      'Invalid username or password. Please check your credentials and try again.'
    );
  }

  // Create token payload
  const payload: TokenPayload = {
    userId: user.userId,
    username: user.username,
  };

  /**
   * TypeScript Concept: Type Assertion for Library Types
   * ----------------------------------------------------
   * jwt.sign has complex overloaded types. We use 'as string' because
   * we know with these options it returns a string synchronously.
   */
  const token = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  }) as string;

  logger.info('User logged in successfully', { userId: user.userId });

  return {
    token,
    user: {
      userId: user.userId,
      username: user.username,
      name: user.name,
    },
  };
}

/**
 * Verify a JWT token and return the payload
 *
 * This is useful for cases where you need to verify a token
 * outside of the middleware context.
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
