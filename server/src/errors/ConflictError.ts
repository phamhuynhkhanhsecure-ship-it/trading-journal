import { AppError } from './AppError.js';

/** Thrown when a resource conflict occurs, e.g. duplicate (HTTP 409). */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}
