/**
 * Job domain model.
 * `JobEntity` is the persisted record; `JobData` is the BullMQ job payload.
 */
import type { JobStatus } from "./job-status.enum.js";

/** Full job record stored in Redis. */
export interface JobEntity {
  jobId: string;
  filename: string;
  size: number;
  status: JobStatus;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  attempts: number;
  errorMessage?: string;
  userId: string;
}

/** Payload passed to the BullMQ worker for processing. */
export interface JobData {
  filename: string;
  size: number;
  userId: string;
  jobId: string;
}
