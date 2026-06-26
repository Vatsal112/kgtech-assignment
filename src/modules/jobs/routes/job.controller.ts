/**
 * Jobs HTTP controller.
 * Handles job creation and status retrieval endpoints.
 */
import type { Request, Response } from "express";
import type { JobService } from "../service/job.service.js";
import type { CreateJobDto } from "../dto/create-job.dto.js";
import {
  successResponse,
  createdResponse,
} from "../../../shared/utils/response.util.js";
import { UnauthorizedError } from "../../../core/errors/index.js";

export class JobController {
  constructor(private readonly jobService: JobService) {}

  /** `POST /jobs` — creates and queues a new file-processing job. */
  createJob = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = req.body as CreateJobDto;
    const result = await this.jobService.createJob(dto, req.user.sub);
    res.status(201).json(createdResponse(result, "Job created and queued"));
  };

  /** `GET /jobs/:id` — returns the current status of a job. */
  getJob = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const result = await this.jobService.getJob(id);
    res.json(successResponse(result, "Job retrieved successfully"));
  };
}
