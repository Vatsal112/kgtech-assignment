/**
 * BullMQ job processor (worker).
 * Simulates file processing with a random delay and a 20% failure rate for demo purposes.
 */
import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { getRedisClient } from "../../../core/redis/redis.client.js";
import { JobRepository } from "../repository/job.repository.js";
import { JobStatus } from "../domain/job-status.enum.js";
import type { JobData } from "../domain/job.entity.js";
import { config } from "../../../config/index.js";
import { logger } from "../../../core/logger/logger.js";
import { sleep, randomBetween } from "../../../shared/utils/sleep.util.js";

/** Probability that a job fails on each attempt (assignment requirement). */
const FAILURE_RATE = 0.2;

/**
 * Core processing logic for a single file job.
 * Updates status to active, simulates work, then marks completed or throws to trigger retry.
 */
async function processFileJob(job: Job<JobData>): Promise<void> {
  const { jobId, filename, size } = job.data;
  const repository = new JobRepository(getRedisClient());

  logger.info("Job started", {
    jobId,
    filename,
    size,
    attempt: job.attemptsMade + 1,
    maxAttempts: job.opts.attempts ?? 3,
  });

  await repository.updateStatus(jobId, JobStatus.ACTIVE, {
    attempts: job.attemptsMade + 1,
  });

  const processingTime = randomBetween(5000, 10000);
  await sleep(processingTime);

  if (Math.random() < FAILURE_RATE) {
    const error = new Error(
      "Simulated processing failure: file validation failed",
    );
    logger.warn("Job failed (simulated)", {
      jobId,
      filename,
      attempt: job.attemptsMade + 1,
      error: error.message,
    });
    throw error;
  }

  await repository.updateStatus(jobId, JobStatus.COMPLETED, {
    completedAt: new Date().toISOString(),
    attempts: job.attemptsMade + 1,
  });

  logger.info("Job completed", {
    jobId,
    filename,
    processingTimeMs: processingTime,
    attempts: job.attemptsMade + 1,
  });
}

/**
 * Creates and starts the BullMQ worker that consumes jobs from the file-processing queue.
 * Registers event listeners for logging and permanent failure handling.
 */
export function createWorker(): Worker<JobData> {
  const redisClient = getRedisClient();
  const repository = new JobRepository(redisClient);

  const worker = new Worker<JobData>(config.QUEUE_NAME, processFileJob, {
    connection: { url: config.REDIS_URL, maxRetriesPerRequest: null },
    concurrency: config.QUEUE_CONCURRENCY,
  });

  worker.on("active", (job: Job<JobData>) => {
    logger.info("Worker picked up job", {
      jobId: job.data.jobId,
      filename: job.data.filename,
    });
  });

  worker.on("completed", (job: Job<JobData>) => {
    logger.info("Worker completed job", {
      jobId: job.data.jobId,
      filename: job.data.filename,
    });
  });

  worker.on("failed", (job: Job<JobData> | undefined, err: Error) => {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 3;
    const isLastAttempt = job.attemptsMade >= maxAttempts;

    if (isLastAttempt) {
      logger.error("Job permanently failed after all retries", {
        jobId: job.data.jobId,
        filename: job.data.filename,
        attempts: job.attemptsMade,
        error: err.message,
      });

      repository
        .updateStatus(job.data.jobId, JobStatus.FAILED, {
          failedAt: new Date().toISOString(),
          attempts: job.attemptsMade,
          errorMessage: err.message,
        })
        .catch((updateErr: Error) => {
          logger.error("Failed to update job status after permanent failure", {
            jobId: job.data.jobId,
            error: updateErr.message,
          });
        });
    } else {
      logger.warn("Job failed, will retry", {
        jobId: job.data.jobId,
        filename: job.data.filename,
        attempt: job.attemptsMade,
        nextAttempt: job.attemptsMade + 1,
        error: err.message,
      });
    }
  });

  worker.on("error", (err: Error) => {
    logger.error("Worker error", { error: err.message, stack: err.stack });
  });

  logger.info("Job worker started", {
    queue: config.QUEUE_NAME,
    concurrency: config.QUEUE_CONCURRENCY,
  });

  // suppress unused var warning - repository is used in worker.on('failed')
  void repository;

  return worker;
}
