import { AppError } from './AppError.js';

/** Thrown when input validation fails (HTTP 400). */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
  }
}
