/**
 * Lifecycle states for a file-processing job.
 */
export enum JobStatus {
  QUEUED = "queued",
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
}
