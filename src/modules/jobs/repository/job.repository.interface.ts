/**
 * Job repository contract.
 * Abstracts job persistence so the service and processor stay storage-agnostic.
 */
import type { JobEntity } from "../domain/job.entity.js";
import type { JobStatus } from "../domain/job-status.enum.js";

export interface IJobRepository {
  create(job: JobEntity): Promise<void>;
  findById(jobId: string): Promise<JobEntity | null>;
  updateStatus(
    jobId: string,
    status: JobStatus,
    updates?: Partial<JobEntity>,
  ): Promise<void>;
}
