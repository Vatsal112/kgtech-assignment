import { JobService } from "../../../src/modules/jobs/service/job.service";
import type { IJobRepository } from "../../../src/modules/jobs/repository/job.repository.interface";
import { JobStatus } from "../../../src/modules/jobs/domain/job-status.enum";
import { NotFoundError } from "../../../src/core/errors/app.error";
import type { Queue } from "bullmq";
import type { JobEntity } from "../../../src/modules/jobs/domain/job.entity";

jest.mock("../../../src/shared/utils/uuid.util", () => ({
  generateId: jest.fn(() => "test-job-uuid-1234"),
}));

jest.mock("../../../src/config/index", () => ({
  config: {
    QUEUE_NAME: "test-queue",
    NODE_ENV: "test",
  },
}));

jest.mock("../../../src/core/logger/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockJobEntity: JobEntity = {
  jobId: "test-job-uuid-1234",
  filename: "orders.csv",
  size: 1024,
  status: JobStatus.QUEUED,
  createdAt: "2024-01-01T00:00:00.000Z",
  attempts: 0,
  userId: "user-123",
};

describe("JobService", () => {
  let jobService: JobService;
  let mockRepository: jest.Mocked<IJobRepository>;
  let mockQueue: jest.Mocked<Pick<Queue, "add">>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "test-job-uuid-1234" }),
    };

    jobService = new JobService(mockRepository, mockQueue as unknown as Queue);
  });

  describe("createJob", () => {
    it("should create a job and return jobId with queued status", async () => {
      const result = await jobService.createJob(
        { filename: "orders.csv", size: 1024 },
        "user-123",
      );

      expect(result).toHaveProperty("jobId");
      expect(result).toHaveProperty("status", JobStatus.QUEUED);
      expect(typeof result.jobId).toBe("string");
      expect(result.jobId.length).toBeGreaterThan(0);
    });

    it("should persist the job to repository", async () => {
      await jobService.createJob(
        { filename: "orders.csv", size: 1024 },
        "user-123",
      );

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "orders.csv",
          size: 1024,
          status: JobStatus.QUEUED,
          userId: "user-123",
        }),
      );
    });

    it("should enqueue the job in BullMQ", async () => {
      await jobService.createJob(
        { filename: "orders.csv", size: 1024 },
        "user-123",
      );

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        "process-file",
        expect.objectContaining({
          filename: "orders.csv",
          size: 1024,
          userId: "user-123",
        }),
        expect.objectContaining({ jobId: expect.any(String) as unknown }),
      );
    });

    it("should set createdAt as a valid ISO date string", async () => {
      await jobService.createJob(
        { filename: "test.csv", size: 2048 },
        "user-456",
      );

      const callArg = mockRepository.create.mock.calls[0]?.[0] as
        | JobEntity
        | undefined;
      expect(callArg?.createdAt).toBeDefined();
      expect(() => new Date(callArg!.createdAt)).not.toThrow();
      expect(new Date(callArg!.createdAt).toISOString()).toBe(
        callArg!.createdAt,
      );
    });
  });

  describe("getJob", () => {
    it("should return job details for an existing job", async () => {
      mockRepository.findById.mockResolvedValue(mockJobEntity);

      const result = await jobService.getJob("test-job-uuid-1234");

      expect(result.jobId).toBe("test-job-uuid-1234");
      expect(result.filename).toBe("orders.csv");
      expect(result.size).toBe(1024);
      expect(result.status).toBe(JobStatus.QUEUED);
      expect(result.attempts).toBe(0);
    });

    it("should throw NotFoundError if job does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(jobService.getJob("nonexistent-id")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should include completedAt for a completed job", async () => {
      const completedJob: JobEntity = {
        ...mockJobEntity,
        status: JobStatus.COMPLETED,
        completedAt: "2024-01-01T00:00:10.000Z",
        attempts: 1,
      };
      mockRepository.findById.mockResolvedValue(completedJob);

      const result = await jobService.getJob("test-job-uuid-1234");

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.completedAt).toBe("2024-01-01T00:00:10.000Z");
    });

    it("should include errorMessage and failedAt for a failed job", async () => {
      const failedJob: JobEntity = {
        ...mockJobEntity,
        status: JobStatus.FAILED,
        failedAt: "2024-01-01T00:00:10.000Z",
        attempts: 3,
        errorMessage: "Simulated processing failure",
      };
      mockRepository.findById.mockResolvedValue(failedJob);

      const result = await jobService.getJob("test-job-uuid-1234");

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.errorMessage).toBe("Simulated processing failure");
      expect(result.failedAt).toBe("2024-01-01T00:00:10.000Z");
      expect(result.attempts).toBe(3);
    });
  });
});
