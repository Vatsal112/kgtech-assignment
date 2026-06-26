/**
 * Application entry point.
 * Boots Redis, the HTTP server, the BullMQ worker, and registers graceful shutdown handlers.
 */
import { createApp } from "./app.js";
import { createWorker } from "./modules/jobs/processor/job.processor.js";
import { getRedisClient, closeRedisClient } from "./core/redis/redis.client.js";
import { closeQueue } from "./core/queue/queue.factory.js";
import { config } from "./config/index.js";
import { logger } from "./core/logger/logger.js";

/**
 * Initializes infrastructure dependencies and starts the HTTP server.
 */
async function bootstrap(): Promise<void> {
  const redis = getRedisClient();

  await redis.ping();
  logger.info("Redis connection verified");

  const app = createApp();
  const worker = createWorker();

  const server = app.listen(config.PORT, () => {
    logger.info("Server started", {
      port: config.PORT,
      env: config.NODE_ENV,
      docs: `http://localhost:${config.PORT}/api-docs`,
      queues: `http://localhost:${config.PORT}/admin/queues`,
    });
  });

  /**
   * Closes the HTTP server, worker, queue, and Redis connections in order.
   * Forces exit if shutdown takes longer than 30 seconds.
   */
  function gracefulShutdown(signal: string): void {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(() => {
      logger.info("HTTP server closed");

      Promise.resolve()
        .then(async () => {
          await worker.close();
          logger.info("Worker closed");
          await closeQueue();
          await closeRedisClient();
          logger.info("Graceful shutdown complete");
          process.exit(0);
        })
        .catch((err: Error) => {
          logger.error("Error during shutdown", { error: err.message });
          process.exit(1);
        });
    });

    setTimeout(() => {
      logger.error("Shutdown timeout — forcing exit");
      process.exit(1);
    }, 30000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error("Unhandled promise rejection", { reason });
    process.exit(1);
  });

  process.on("uncaughtException", (err: Error) => {
    logger.error("Uncaught exception", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });
}

bootstrap().catch((err: Error) => {
  logger.error("Failed to start server", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
