import request from "supertest";
import type { Application } from "express";

interface JobBody {
  success: boolean;
  details?: unknown;
  data: {
    jobId?: string;
    status?: string;
    filename?: string;
    size?: number;
    createdAt?: string;
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
    delayed?: number;
  };
}

interface HealthBody {
  data: { status: string };
}

jest.mock("../../src/config/index", () => ({
  config: {
    PORT: 3002,
    NODE_ENV: "test",
    REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    JWT_SECRET: "test-integration-secret-123",
    JWT_REFRESH_SECRET: "test-integration-refresh-secret",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    QUEUE_NAME: "test-jobs-queue",
    QUEUE_CONCURRENCY: 1,
    AWS_REGION: "us-east-1",
    CORS_ORIGIN: ["*"],
    CORS_CREDENTIALS: true,
  },
}));

jest.mock("../../src/swagger/swagger", () => ({
  setupSwagger: jest.fn(),
}));

jest.mock("../../src/infrastructure/monitoring/bull-board", () => ({
  setupBullBoard: jest.fn(),
}));

jest.mock("../../src/modules/jobs/processor/job.processor", () => ({
  createWorker: jest.fn().mockReturnValue({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe("Jobs API Integration Tests", () => {
  let app: Application;
  let accessToken: string;
  let jobId: string;

  beforeAll(async () => {
    const { createApp } = await import("../../src/app");
    app = createApp();

    const email = `jobs-test-${Date.now()}@example.com`;
    const loginRes = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: "TestPass1" });

    accessToken = (
      loginRes.body as { data: { tokens: { accessToken: string } } }
    ).data.tokens.accessToken;
  });

  afterAll(async () => {
    const { closeRedisClient } =
      await import("../../src/core/redis/redis.client");
    const { closeQueue } = await import("../../src/core/queue/queue.factory");
    await closeQueue().catch(() => undefined);
    await closeRedisClient().catch(() => undefined);
  });

  describe("POST /api/v1/jobs", () => {
    it("should create a new job when authenticated", async () => {
      const res = await request(app)
        .post("/api/v1/jobs")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ filename: "orders.csv", size: 1024 });

      const body = res.body as JobBody;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBeDefined();
      expect(body.data.status).toBe("queued");

      jobId = body.data.jobId as string;
    });

    it("should return 401 when not authenticated", async () => {
      const res = await request(app)
        .post("/api/v1/jobs")
        .send({ filename: "orders.csv", size: 1024 });

      expect(res.status).toBe(401);
    });

    it("should return 400 for missing filename", async () => {
      const res = await request(app)
        .post("/api/v1/jobs")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ size: 1024 });

      const body = res.body as JobBody;
      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.details).toBeDefined();
    });

    it("should return 400 for negative size", async () => {
      const res = await request(app)
        .post("/api/v1/jobs")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ filename: "test.csv", size: -100 });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing size", async () => {
      const res = await request(app)
        .post("/api/v1/jobs")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ filename: "test.csv" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/jobs/:id", () => {
    it("should return job status for existing job", async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      const body = res.body as JobBody;
      expect(res.status).toBe(200);
      expect(body.data.jobId).toBe(jobId);
      expect(body.data.filename).toBe("orders.csv");
      expect(body.data.status).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
    });

    it("should return 404 for non-existent job", async () => {
      const res = await request(app)
        .get("/api/v1/jobs/non-existent-id-xyz")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect((res.body as JobBody).success).toBe(false);
    });

    it("should return 401 when not authenticated", async () => {
      const res = await request(app).get(`/api/v1/jobs/${jobId}`);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/stats", () => {
    it("should return queue statistics when authenticated", async () => {
      const res = await request(app)
        .get("/api/v1/stats")
        .set("Authorization", `Bearer ${accessToken}`);

      const body = res.body as JobBody;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        waiting: expect.any(Number) as unknown,
        active: expect.any(Number) as unknown,
        completed: expect.any(Number) as unknown,
        failed: expect.any(Number) as unknown,
        delayed: expect.any(Number) as unknown,
      });
    });
  });

  describe("GET /health", () => {
    it("should return 200 health status", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect((res.body as HealthBody).data.status).toBe("ok");
    });
  });
});
