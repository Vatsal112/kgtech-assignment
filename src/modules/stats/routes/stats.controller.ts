/**
 * Stats HTTP controller.
 */
import type { Request, Response } from "express";
import type { StatsService } from "../service/stats.service.js";
import { successResponse } from "../../../shared/utils/response.util.js";

export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /** `GET /stats` — returns BullMQ queue statistics. */
  getStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.statsService.getQueueStats();
    res.json(successResponse(stats, "Queue statistics retrieved"));
  };
}
