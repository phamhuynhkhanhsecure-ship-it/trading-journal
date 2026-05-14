import { AppError } from './AppError.js';

/** Thrown when authentication fails or is missing (HTTP 401). */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}
