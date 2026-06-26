import { JobStatus } from "../../../src/modules/jobs/domain/job-status.enum";

jest.mock("../../../src/config/index", () => ({
  config: {
    QUEUE_NAME: "test-queue",
    QUEUE_CONCURRENCY: 5,
    REDIS_URL: "redis://localhost:6379",
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-12345678",
    JWT_REFRESH_SECRET: "test-refresh-secret-1",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
  },
}));

jest.mock("../../../src/core/redis/redis.client", () => ({
  getRedisClient: jest.fn().mockReturnValue({}),
}));

jest.mock("../../../src/modules/jobs/repository/job.repository", () => ({
  JobRepository: jest.fn().mockImplementation(() => ({
    updateStatus: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../../src/core/logger/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../../src/shared/utils/sleep.util", () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
  randomBetween: jest.fn().mockReturnValue(5000),
}));

jest.mock("bullmq", () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("Job Processor", () => {
  describe("JobStatus enum", () => {
    it("should define all required statuses", () => {
      expect(JobStatus.QUEUED).toBe("queued");
      expect(JobStatus.ACTIVE).toBe("active");
      expect(JobStatus.COMPLETED).toBe("completed");
      expect(JobStatus.FAILED).toBe("failed");
    });
  });

  describe("createWorker", () => {
    it("should create a BullMQ Worker with correct queue name", () => {
      const { createWorker } = jest.requireActual(
        "../../../src/modules/jobs/processor/job.processor",
      ) as unknown as { createWorker: () => unknown };
      const { Worker } = jest.requireMock("bullmq") as unknown as { Worker: jest.Mock };

      createWorker();

      expect(Worker).toHaveBeenCalledWith(
        "test-queue",
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        }),
      );
    });
  });
});
