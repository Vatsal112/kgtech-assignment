/**
 * Job API response DTOs.
 */
import type { JobStatus } from "../domain/job-status.enum.js";

/** Response returned immediately after a job is created and queued. */
export interface CreateJobResponseDto {
  jobId: string;
  status: JobStatus;
}

/** Full job status returned by `GET /jobs/:id`. */
export interface JobStatusResponseDto {
  jobId: string;
  filename: string;
  size: number;
  status: JobStatus;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  attempts: number;
  errorMessage?: string;
}
