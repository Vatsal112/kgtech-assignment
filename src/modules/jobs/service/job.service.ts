/**
 * Job service.
 * Orchestrates job creation (persist + enqueue) and status retrieval.
 */
import type { Queue } from "bullmq";
import { generateId } from "../../../shared/utils/uuid.util.js";
import type { IJobRepository } from "../repository/job.repository.interface.js";
import type { CreateJobDto } from "../dto/create-job.dto.js";
import type {
  CreateJobResponseDto,
  JobStatusResponseDto,
} from "../dto/job-response.dto.js";
import type { JobEntity } from "../domain/job.entity.js";
import { JobStatus } from "../domain/job-status.enum.js";
import { NotFoundError } from "../../../core/errors/index.js";
import { QUEUE_JOB_NAME } from "../../../shared/constants/index.js";
import { logger } from "../../../core/logger/logger.js";

export class JobService {
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly queue: Queue,
  ) {}

  /**
   * Creates a job record in Redis and enqueues it for background processing.
   *
   * @param dto - Validated file metadata from the request body.
   * @param userId - Id of the authenticated user who submitted the job.
   */
  async createJob(
    dto: CreateJobDto,
    userId: string,
  ): Promise<CreateJobResponseDto> {
    const jobId = generateId();

    const jobEntity: JobEntity = {
      jobId,
      filename: dto.filename,
      size: dto.size,
      status: JobStatus.QUEUED,
      createdAt: new Date().toISOString(),
      attempts: 0,
      userId,
    };

    await this.jobRepository.create(jobEntity);

    await this.queue.add(
      QUEUE_JOB_NAME,
      { filename: dto.filename, size: dto.size, userId, jobId },
      { jobId },
    );

    logger.info("Job created and queued", {
      jobId,
      filename: dto.filename,
      userId,
    });

    return { jobId, status: JobStatus.QUEUED };
  }

  /**
   * Returns the current status and metadata for a job.
   *
   * @throws {NotFoundError} When no job exists with the given id.
   */
  async getJob(jobId: string): Promise<JobStatusResponseDto> {
    const job = await this.jobRepository.findById(jobId);

    if (!job) {
      throw new NotFoundError("Job", jobId);
    }

    return {
      jobId: job.jobId,
      filename: job.filename,
      size: job.size,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      attempts: job.attempts,
      errorMessage: job.errorMessage,
    };
  }
}
