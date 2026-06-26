/**
 * Global Express error handlers.
 * Normalizes Zod, AppError, and unexpected errors into a consistent JSON shape.
 */
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError, ValidationError } from "../errors/index.js";
import { logger } from "../logger/logger.js";
import { config } from "../../config/index.js";

interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  details?: unknown;
  stack?: string;
}

/**
 * Central error handler — must be registered last in the middleware chain.
 * Converts known error types into structured API responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    const response: ErrorResponse = {
      success: false,
      message: "Validation failed",
      statusCode: 400,
      details,
    };

    logger.warn("Validation error", { details });
    res.status(400).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
    };

    if (config.NODE_ENV !== "production") {
      response.stack = err.stack;
    }

    if (err.isOperational) {
      logger.warn("Operational error", {
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      });
    } else {
      logger.error("Non-operational error", {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
      });
    }

    res.status(err.statusCode).json(response);
    return;
  }

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  const response: ErrorResponse = {
    success: false,
    message:
      config.NODE_ENV === "production" ? "Internal server error" : err.message,
    statusCode: 500,
  };

  if (config.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

/**
 * Catch-all for unmatched routes.
 * Forwards a 404 error to the global error handler.
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const err = new ValidationError(`Route ${req.method} ${req.path} not found`);
  Object.assign(err, { statusCode: 404 });
  next(err);
}
