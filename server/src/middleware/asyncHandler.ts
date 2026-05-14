import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler so that any thrown error
 * is automatically forwarded to Express's global error handler.
 * Eliminates the need for try/catch in every route.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
