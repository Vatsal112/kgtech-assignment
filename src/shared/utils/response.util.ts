/**
 * Standard API response helpers.
 * Ensures every endpoint returns a consistent `{ success, message, data }` envelope.
 */

/** Shape of all successful API responses. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

/**
 * Builds a 200-level success response.
 *
 * @param data - Payload returned in the `data` field.
 * @param message - Human-readable status message.
 * @param meta - Optional pagination or metadata.
 */
export function successResponse<T>(
  data: T,
  message = "Success",
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
}

/**
 * Builds a 201 Created response.
 *
 * @param data - Newly created resource payload.
 * @param message - Human-readable status message.
 */
export function createdResponse<T>(
  data: T,
  message = "Created successfully",
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}
