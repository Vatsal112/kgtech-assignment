/**
 * BullMQ queue factory for file-processing jobs.
 * Configures retry, backoff, and retention policies for queued work.
 */
import { Queue } from "bullmq";
import { config } from "../../config/index.js";
import { logger } from "../logger/logger.js";

let fileProcessingQueue: Queue | null = null;

/**
 * Returns the singleton file-processing queue.
 * Jobs are retried up to 3 times with exponential backoff.
 */
export function getFileProcessingQueue(): Queue {
  if (!fileProcessingQueue) {
    fileProcessingQueue = new Queue(config.QUEUE_NAME, {
      connection: { url: config.REDIS_URL, maxRetriesPerRequest: null },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          count: 100,
          age: 86400,
        },
        removeOnFail: {
          count: 50,
          age: 86400,
        },
      },
    });

    fileProcessingQueue.on("error", (err: Error) => {
      logger.error("Queue error", {
        queue: config.QUEUE_NAME,
        error: err.message,
      });
    });

    logger.info("BullMQ queue initialized", { queue: config.QUEUE_NAME });
  }

  return fileProcessingQueue;
}

/** Closes the queue connection during graceful shutdown. */
export async function closeQueue(): Promise<void> {
  if (fileProcessingQueue) {
    await fileProcessingQueue.close();
    fileProcessingQueue = null;
    logger.info("Queue closed");
  }
}
