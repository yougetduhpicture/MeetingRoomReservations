/**
 * TypeScript Concept: Classes and Inheritance
 * -------------------------------------------
 * TypeScript classes work like ES6 classes but with type annotations.
 * The 'extends' keyword creates inheritance - child classes get all
 * properties and methods from the parent class.
 *
 * Why Custom Error Classes?
 * -------------------------
 * By creating specific error types, our error handling middleware can
 * check which type of error occurred and respond appropriately. This is
 * much cleaner than checking error messages or using magic numbers.
 */

/**
 * Base API Error Class
 * --------------------
 * All our custom errors extend this class. It adds a statusCode property
 * to the standard Error class.
 *
 * TypeScript Concept: Access Modifiers
 * ------------------------------------
 * - public: accessible from anywhere (default)
 * - private: only accessible within the class
 * - protected: accessible within the class and subclasses
 * - readonly: can only be set in constructor, then immutable
 */
export class ApiError extends Error {
  public readonly statusCode: number;

  /**
   * TypeScript Concept: Constructor Parameter Properties
   * ----------------------------------------------------
   * When you add an access modifier (public, private, protected) to a
   * constructor parameter, TypeScript automatically:
   * 1. Creates a property with that name
   * 2. Assigns the parameter value to it
   *
   * So 'public readonly statusCode: number' in the constructor is shorthand for:
   *   statusCode: number;
   *   constructor(statusCode: number) { this.statusCode = statusCode; }
   *
   * We're using the explicit property approach here for clarity.
   */
  constructor(message: string, statusCode: number) {
    // Call the parent Error constructor
    super(message);

    this.statusCode = statusCode;

    /**
     * JavaScript Quirk: Error Subclassing
     * -----------------------------------
     * When extending built-in classes like Error, we need to set the prototype
     * explicitly for instanceof checks to work correctly in older JS environments.
     */
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture a clean stack trace (V8 engines only, like Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the error name to the class name for better debugging
    this.name = this.constructor.name;
  }
}

/**
 * 400 Bad Request - Validation Error
 * -----------------------------------
 * Used when input validation fails (missing fields, wrong format, etc.)
 */
export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized
 * ----------------
 * Used when authentication is required but missing or invalid.
 * Example: No token provided, token expired, invalid token.
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden
 * -------------
 * Used when user is authenticated but doesn't have permission.
 * Example: Trying to delete another user's reservation.
 *
 * Note: We use UnauthorizedError for both 401 and 403 cases in this API.
 * For 403 specifically, we pass a custom message and can check statusCode
 * if we need to differentiate. Some APIs create a separate ForbiddenError.
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

/**
 * 404 Not Found
 * -------------
 * Used when a requested resource doesn't exist.
 * Example: Room not found, reservation not found.
 */
export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 404);
  }
}

/**
 * 409 Conflict
 * ------------
 * Used when the request conflicts with current state.
 * Example: Trying to book a time slot that's already taken.
 *
 * TypeScript Concept: Optional Properties with Default Values
 * -----------------------------------------------------------
 * The details parameter has a default value of undefined, making it optional.
 * The '?' in the property definition (details?: ConflictDetails) means
 * the property might not exist on the object.
 */
export interface ConflictDetails {
  existingReservation?: {
    reservationId: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
  };
}

export class ConflictError extends ApiError {
  public readonly details?: ConflictDetails;

  constructor(message: string, details?: ConflictDetails) {
    super(message, 409);
    this.details = details;
  }
}

/**
 * TypeScript Concept: Type Guards
 * -------------------------------
 * Sometimes TypeScript doesn't know what type something is. Type guards
 * are functions that help TypeScript narrow down the type.
 *
 * The 'error is ApiError' return type is a "type predicate" - it tells
 * TypeScript that if this function returns true, the error is definitely
 * an ApiError within that code block.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
