/**
 * Application-wide constants for Redis keys, TTLs, queue names, and HTTP status codes.
 */

/** Redis key builders — keeps key naming consistent across repositories. */
export const REDIS_KEYS = {
  JOB: (id: string) => `job:${id}`,
  USER: (email: string) => `user:${email}`,
  REFRESH_TOKEN: (token: string) => `refresh:${token}`,
} as const;

/** Completed/failed jobs expire from Redis after 24 hours. */
export const JOB_TTL_SECONDS = 86400;
/** User records are stored without expiry. */
export const USER_TTL_SECONDS = 0;
/** Refresh tokens expire after 7 days. */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** BullMQ job name used when enqueueing file-processing work. */
export const QUEUE_JOB_NAME = "process-file";

/** Common HTTP status codes used across controllers and tests. */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
