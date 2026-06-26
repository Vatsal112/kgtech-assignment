/**
 * Application error hierarchy.
 * Operational errors map to predictable HTTP responses via the global error handler.
 */

/** Base error class carrying an HTTP status code and optional details payload. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  /**
   * @param message - Human-readable error message returned to the client.
   * @param statusCode - HTTP status code to send.
   * @param details - Optional structured validation or context details.
   * @param isOperational - When false, treated as an unexpected server failure.
   */
  constructor(
    message: string,
    statusCode: number,
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Thrown when a requested resource does not exist (HTTP 404). */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
    );
  }
}

/** Thrown when authentication is missing or invalid (HTTP 401). */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

/** Thrown when the user is authenticated but not permitted (HTTP 403). */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403);
  }
}

/** Thrown for invalid input or malformed requests (HTTP 400). */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
  }
}

/** Thrown when an action conflicts with existing state, e.g. duplicate email (HTTP 409). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** Thrown when a client exceeds rate limits (HTTP 429). */
export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(message, 429);
  }
}

/** Thrown for unexpected server failures (HTTP 500). */
export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500, undefined, false);
  }
}

/** Thrown when a dependency such as S3 is not configured or unavailable (HTTP 503). */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable") {
    super(message, 503);
  }
}
