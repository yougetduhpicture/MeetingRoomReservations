import { Request, Response, NextFunction } from 'express';
import { login } from '../services/authService';
import { LoginInput } from '../validators/reservationValidator';

/**
 * Login Controller
 * ----------------
 * Handles POST /api/login
 *
 * Controllers are intentionally thin - they only:
 * 1. Extract data from the request (already validated by middleware)
 * 2. Call the appropriate service method
 * 3. Format and send the response
 *
 * All business logic lives in the service layer.
 *
 * TypeScript Concept: Request Body Typing
 * ---------------------------------------
 * Request<Params, ResBody, ReqBody> is a generic type. By passing
 * LoginInput as the third type parameter, we tell TypeScript that
 * req.body will have the shape of LoginInput (username, password).
 */
export async function loginController(
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username, password } = req.body;

    const result = await login(username, password);

    res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    // Pass errors to the error handling middleware
    next(error);
  }
}
