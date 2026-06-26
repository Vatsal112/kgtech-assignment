/**
 * Async route handler wrapper.
 * Forwards rejected promises to Express's `next()` error pipeline.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

/**
 * Wraps an async controller so thrown errors reach the global error handler.
 *
 * @param fn - Async Express route handler.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
