import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ZodSchema, ZodError } from 'zod';
import config from './config';
import logger from './logger';
import { TokenPayload, ApiErrorResponse } from '../types';
import {
  ApiError,
  isApiError,
  UnauthorizedError,
  ValidationError,
} from '../errors/ApiError';
import { getFirstZodError } from '../validators/reservationValidator';

export const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authentication required. Please provide a valid token.');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError(
        'Invalid authorization format. Use: Bearer <token>'
      );
    }

    const token = parts[1];
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;

    req.user = decoded;

    logger.debug('User authenticated', { userId: decoded.userId });
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token. Please log in again.'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token has expired. Please log in again.'));
    } else {
      next(error);
    }
  }
};

type ValidationSource = 'body' | 'params' | 'query';

export function validate(
  schema: ZodSchema,
  source: ValidationSource = 'body'
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validated = schema.parse(data);

      if (source === 'body') {
        req.body = validated;
      } else if (source === 'params') {
        req.params = validated;
      } else {
        req.query = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = getFirstZodError(error);
        next(new ValidationError(message));
      } else {
        next(error);
      }
    }
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : 'Unknown error',
  });

  let response: ApiErrorResponse;

  if (isApiError(err)) {
    response = {
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
    };
  } else if (err instanceof ZodError) {
    response = {
      error: 'ValidationError',
      message: getFirstZodError(err),
      statusCode: 400,
    };
  } else if (err instanceof SyntaxError && 'body' in err) {
    response = {
      error: 'ValidationError',
      message: 'Invalid JSON in request body',
      statusCode: 400,
    };
  } else if (err instanceof Error) {
    response = {
      error: 'InternalServerError',
      message:
        config.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred',
      statusCode: 500,
    };
  } else {
    response = {
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  res.status(response.statusCode).json(response);
}

export const requestLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.on('finish', () => {
    logger.request(req.method, req.path, res.statusCode);
  });
  next();
};

export const notFoundHandler: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new ApiError(
    `Endpoint not found: ${req.method} ${req.path}`,
    404
  );
  next(error);
};
