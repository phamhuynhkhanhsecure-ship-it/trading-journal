/**
 * Base application error class.
 * All custom errors should extend this class.
 * Provides a consistent error interface with HTTP status codes.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}
