import jwt from 'jsonwebtoken';
import config from '../utils/config';
import logger from '../utils/logger';
import { TokenPayload } from '../types';
import { findUserByUsername, verifyPassword } from '../models/user';
import { UnauthorizedError } from '../errors/ApiError';

interface LoginResult {
  token: string;
  user: {
    userId: string;
    username: string;
    name: string;
  };
}

export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  logger.debug('Login attempt', { username });

  const user = findUserByUsername(username);

  if (!user) {
    logger.debug('Login failed - user not found', { username });
    throw new UnauthorizedError(
      'Invalid username or password. Please check your credentials and try again.'
    );
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    logger.debug('Login failed - invalid password', { username });
    throw new UnauthorizedError(
      'Invalid username or password. Please check your credentials and try again.'
    );
  }

  const payload: TokenPayload = {
    userId: user.userId,
    username: user.username,
  };

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

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
