/**
 * Redis-backed rate limiting middleware.
 * Protects auth, API, and upload routes from abuse using per-IP counters.
 */
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";
import { getRedisClient } from "../redis/redis.client.js";

/** Creates a Redis store with a unique key prefix for each limiter. */
function createRedisStore(prefix: string) {
  return new RedisStore({
    sendCommand: async (...args: string[]): Promise<RedisReply> => {
      const client = getRedisClient();
      return client.call(args[0], ...args.slice(1)) as Promise<RedisReply>;
    },
    prefix,
  });
}

/**
 * Factory for a Redis-backed rate limiter.
 * Skipped entirely in the test environment to avoid flaky integration tests.
 */
function createLimiter(
  windowMs: number,
  limit: number,
  message: object,
  storePrefix: string,
): RequestHandler {
  const limiter = rateLimit({
    windowMs,
    limit,
    message,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: createRedisStore(storePrefix),
    skip: () => process.env["NODE_ENV"] === "test",
  });
  return limiter;
}

/** Auth routes: 10 requests per 15 minutes per IP. */
export const authLimiter: RequestHandler = createLimiter(
  15 * 60 * 1000,
  10,
  {
    success: false,
    message: "Too many auth requests, please try again in 15 minutes",
  },
  "rl:auth:",
);

/** General API routes: 60 requests per minute per IP. */
export const apiLimiter: RequestHandler = createLimiter(
  60 * 1000,
  60,
  { success: false, message: "Too many requests, please slow down" },
  "rl:api:",
);

/** Upload URL routes: 10 requests per minute per IP. */
export const uploadLimiter: RequestHandler = createLimiter(
  60 * 1000,
  10,
  {
    success: false,
    message: "Too many upload URL requests, please slow down",
  },
  "rl:upload:",
);
