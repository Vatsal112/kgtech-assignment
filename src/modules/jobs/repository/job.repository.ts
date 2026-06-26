/**
 * Redis implementation of the job repository.
 * Terminal jobs (completed/failed) are stored with a 24-hour TTL.
 */
import type Redis from "ioredis";
import type { IJobRepository } from "./job.repository.interface.js";
import type { JobEntity } from "../domain/job.entity.js";
import { JobStatus } from "../domain/job-status.enum.js";
import {
  REDIS_KEYS,
  JOB_TTL_SECONDS,
} from "../../../shared/constants/index.js";

export class JobRepository implements IJobRepository {
  constructor(private readonly redis: Redis) {}

  /** Persists a new job record in Redis. */
  async create(job: JobEntity): Promise<void> {
    await this.redis.set(REDIS_KEYS.JOB(job.jobId), JSON.stringify(job));
  }

  /** Retrieves a job by id, or null if it does not exist. */
  async findById(jobId: string): Promise<JobEntity | null> {
    const data = await this.redis.get(REDIS_KEYS.JOB(jobId));
    if (!data) return null;
    return JSON.parse(data) as JobEntity;
  }

  /**
   * Updates a job's status and optional fields.
   * Applies a TTL when the job reaches a terminal state (completed or failed).
   */
  async updateStatus(
    jobId: string,
    status: JobStatus,
    updates?: Partial<JobEntity>,
  ): Promise<void> {
    const existing = await this.findById(jobId);
    if (!existing) return;

    const updated: JobEntity = { ...existing, ...updates, status };

    const isTerminal =
      status === JobStatus.COMPLETED || status === JobStatus.FAILED;
    if (isTerminal) {
      await this.redis.setex(
        REDIS_KEYS.JOB(jobId),
        JOB_TTL_SECONDS,
        JSON.stringify(updated),
      );
    } else {
      await this.redis.set(REDIS_KEYS.JOB(jobId), JSON.stringify(updated));
    }
  }
}
