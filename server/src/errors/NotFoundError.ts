import { AppError } from './AppError.js';

/** Thrown when a requested resource does not exist (HTTP 404). */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}
