/**
 * Redis client singleton.
 * BullMQ and repositories share one ioredis connection.
 */
import Redis from "ioredis";
import { config } from "../../config/index.js";
import { logger } from "../logger/logger.js";

let redisClient: Redis | null = null;

/**
 * Returns the shared Redis client, creating it on first access.
 *
 * `maxRetriesPerRequest: null` is required for BullMQ compatibility.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });

    redisClient.on("connect", () => {
      logger.info("Redis client connected");
    });

    redisClient.on("error", (err: Error) => {
      logger.error("Redis client error", { error: err.message });
    });

    redisClient.on("close", () => {
      logger.warn("Redis client connection closed");
    });

    redisClient.on("reconnecting", () => {
      logger.info("Redis client reconnecting...");
    });
  }

  return redisClient;
}

/** Gracefully closes the Redis connection during shutdown. */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis client disconnected");
  }
}
