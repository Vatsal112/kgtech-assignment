import request from "supertest";
import type { Application } from "express";

interface AuthBody {
  success: boolean;
  details?: unknown;
  data: {
    user: { id: string; email: string };
    tokens: { accessToken: string; refreshToken: string };
    email?: string;
    accessToken?: string;
  };
}

jest.mock("../../src/config/index", () => ({
  config: {
    PORT: 3001,
    NODE_ENV: "test",
    REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    JWT_SECRET: "test-integration-secret-123",
    JWT_REFRESH_SECRET: "test-integration-refresh-secret",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    QUEUE_NAME: "test-file-processing",
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

describe("Auth API Integration Tests", () => {
  let app: Application;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../../src/app");
    app = createApp();
  });

  afterAll(async () => {
    const { closeRedisClient } =
      await import("../../src/core/redis/redis.client");
    const { closeQueue } = await import("../../src/core/queue/queue.factory");
    await closeQueue().catch(() => undefined);
    await closeRedisClient().catch(() => undefined);
  });

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: "TestPass1",
  };

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      const body = res.body as AuthBody;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(testUser.email);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();

      accessToken = body.data.tokens.accessToken;
      refreshToken = body.data.tokens.refreshToken;
    });

    it("should return 409 when registering with existing email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(res.status).toBe(409);
      expect((res.body as AuthBody).success).toBe(false);
    });

    it("should return 400 for invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "not-an-email", password: "TestPass1" });

      const body = res.body as AuthBody;
      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.details).toBeDefined();
    });

    it("should return 400 for weak password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "valid@example.com", password: "short" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with correct credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send(testUser);

      const body = res.body as AuthBody;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();

      accessToken = body.data.tokens.accessToken;
      refreshToken = body.data.tokens.refreshToken;
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: testUser.email, password: "WrongPass1" });

      expect(res.status).toBe(401);
    });

    it("should return 401 for unknown user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "noone@example.com", password: "TestPass1" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return user info when authenticated", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${accessToken}`);

      const body = res.body as AuthBody;
      expect(res.status).toBe(200);
      expect(body.data.email).toBe(testUser.email);
    });

    it("should return 401 when not authenticated", async () => {
      const res = await request(app).get("/api/v1/auth/me");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should return new tokens with a valid refresh token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken });

      const body = res.body as AuthBody;
      expect(res.status).toBe(200);
      expect(body.data.accessToken).toBeDefined();
    });
  });
});
