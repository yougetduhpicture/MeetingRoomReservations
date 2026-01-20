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

/**
 * TypeScript Concept: Express Middleware Types
 * --------------------------------------------
 * Express middleware functions have a specific signature:
 * (req: Request, res: Response, next: NextFunction) => void
 *
 * The 'next' function passes control to the next middleware.
 * If you call next(error), it passes to error-handling middleware.
 */

/**
 * Authentication Middleware
 * -------------------------
 * Extracts and verifies JWT from the Authorization header.
 * If valid, attaches the decoded payload to req.user.
 * If invalid, throws an UnauthorizedError.
 *
 * TypeScript Concept: Type Narrowing
 * ----------------------------------
 * After this middleware runs successfully, req.user is definitely set.
 * However, TypeScript doesn't know this, so downstream code still sees
 * req.user as 'TokenPayload | undefined'. You might need to check or
 * use non-null assertion (req.user!) when you're certain it's set.
 */
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

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError(
        'Invalid authorization format. Use: Bearer <token>'
      );
    }

    const token = parts[1];

    /**
     * TypeScript Concept: Type Assertion with 'as'
     * --------------------------------------------
     * jwt.verify returns 'string | JwtPayload'. We know our payload
     * matches TokenPayload, so we tell TypeScript with 'as TokenPayload'.
     *
     * This is safe here because we control what goes into the token
     * during login. In general, be careful with type assertions -
     * they bypass TypeScript's safety checks.
     */
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;

    // Attach user info to request for downstream handlers
    req.user = decoded;

    logger.debug('User authenticated', { userId: decoded.userId });
    next();
  } catch (error) {
    // Handle specific JWT errors with user-friendly messages
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token. Please log in again.'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token has expired. Please log in again.'));
    } else {
      next(error);
    }
  }
};

/**
 * Request Validation Middleware Factory
 * -------------------------------------
 * Creates middleware that validates request data against a Zod schema.
 *
 * TypeScript Concept: Higher-Order Functions
 * ------------------------------------------
 * This function RETURNS a middleware function. It's a "factory" that
 * creates customized middleware based on the schema you provide.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema, 'body'), loginController);
 *
 * The 'source' parameter determines what part of the request to validate:
 * - 'body': request body (POST/PUT data)
 * - 'params': URL parameters (/users/:id)
 * - 'query': query string (?page=1&limit=10)
 */
type ValidationSource = 'body' | 'params' | 'query';

export function validate(
  schema: ZodSchema,
  source: ValidationSource = 'body'
): RequestHandler {
  /**
   * TypeScript Concept: Closure
   * ---------------------------
   * The returned function "closes over" the schema and source variables,
   * keeping them accessible even after validate() has returned.
   */
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Get the data to validate based on source
      const data = req[source];

      // Validate and replace with parsed/transformed data
      const validated = schema.parse(data);

      // Replace the original data with validated data
      // This ensures we're working with clean, typed data
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
        // Convert Zod error to our ValidationError
        const message = getFirstZodError(error);
        next(new ValidationError(message));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Error Handling Middleware
 * -------------------------
 * This is Express's error-handling middleware. It has 4 parameters
 * (err, req, res, next) which tells Express this handles errors.
 *
 * TypeScript Concept: Error Types
 * -------------------------------
 * The 'err' parameter is typed as 'unknown' because errors can be
 * anything in JavaScript. We use type guards and checks to handle
 * different error types safely.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error for debugging
  logger.error('Error occurred', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : 'Unknown error',
  });

  // Build error response
  let response: ApiErrorResponse;

  if (isApiError(err)) {
    // Our custom API errors
    response = {
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
    };
  } else if (err instanceof ZodError) {
    // Zod validation errors that weren't caught by validate middleware
    response = {
      error: 'ValidationError',
      message: getFirstZodError(err),
      statusCode: 400,
    };
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON parsing errors (malformed request body)
    response = {
      error: 'ValidationError',
      message: 'Invalid JSON in request body',
      statusCode: 400,
    };
  } else if (err instanceof Error) {
    // Generic errors - don't expose internal details in production
    response = {
      error: 'InternalServerError',
      message:
        config.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred',
      statusCode: 500,
    };
  } else {
    // Unknown error type
    response = {
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  res.status(response.statusCode).json(response);
}

/**
 * Request Logging Middleware
 * --------------------------
 * Logs incoming requests for debugging and monitoring.
 */
export const requestLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log when the request completes
  res.on('finish', () => {
    logger.request(req.method, req.path, res.statusCode);
  });
  next();
};

/**
 * 404 Not Found Handler
 * ---------------------
 * Catches requests that don't match any route.
 */
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
