import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

/**
 * Global error handler middleware.
 * Must be registered LAST with app.use().
 *
 * - AppError subclasses → structured JSON with appropriate status code.
 * - Unknown errors → 500 Internal Server Error.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(`[ERROR] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details != null && { details: err.details }),
    });
    return;
  }

  // Unexpected / unhandled error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
