import { Request, Response, NextFunction } from 'express';
import { login } from '../services/authService';
import { LoginInput } from '../validators/reservationValidator';

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
    next(error);
  }
}
