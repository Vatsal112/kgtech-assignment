/**
 * Express application factory.
 * Wires global middleware, API routes, documentation, and monitoring endpoints.
 */
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { corsMiddleware } from "./core/middleware/cors.middleware.js";
import { createAuthRouter } from "./modules/auth/routes/auth.router.js";
import { createJobRouter } from "./modules/jobs/routes/job.router.js";
import { createStatsRouter } from "./modules/stats/routes/stats.router.js";
import { createUploadRouter } from "./modules/upload/routes/upload.router.js";
import {
  errorHandler,
  notFoundHandler,
} from "./core/middleware/error-handler.middleware.js";
import { setupBullBoard } from "./infrastructure/monitoring/bull-board.js";
import { setupSwagger } from "./swagger/swagger.js";
import { successResponse } from "./shared/utils/response.util.js";
import { logger } from "./core/logger/logger.js";

/**
 * Creates and configures the Express application without starting the server.
 *
 * @returns Configured Express app ready to listen on a port.
 */
export function createApp(): express.Application {
  const app = express();

  app.use(corsMiddleware);

  app.use(
    helmet({
      // Swagger UI and Bull Board rely on inline scripts/styles.
      contentSecurityPolicy: false,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    morgan("combined", {
      stream: { write: (message: string) => logger.http(message.trim()) },
    }),
  );

  setupSwagger(app);
  setupBullBoard(app);

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Health check endpoint
   *     responses:
   *       200:
   *         description: Service is healthy
   */
  app.get("/health", (_req, res) => {
    res.json(
      successResponse(
        {
          status: "ok",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        "Service is healthy",
      ),
    );
  });

  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/jobs", createJobRouter());
  app.use("/api/v1/stats", createStatsRouter());
  app.use("/api/v1/upload-url", createUploadRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
