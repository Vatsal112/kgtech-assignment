/**
 * Queue statistics service.
 * Reads live job counts from BullMQ for monitoring dashboards.
 */
import type { Queue } from "bullmq";

/** Snapshot of job counts grouped by BullMQ state. */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export class StatsService {
  constructor(private readonly queue: Queue) {}

  /** Fetches current waiting, active, completed, failed, and delayed job counts. */
  async getQueueStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
