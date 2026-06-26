import { Router } from "express";
import { StatsController } from "./stats.controller.js";
import { StatsService } from "../service/stats.service.js";
import { getFileProcessingQueue } from "../../../core/queue/queue.factory.js";
import { getRedisClient } from "../../../core/redis/redis.client.js";
import { createAuthMiddleware } from "../../../core/middleware/auth.middleware.js";
import { apiLimiter } from "../../../core/middleware/rate-limit.middleware.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import { AuthService } from "../../auth/service/auth.service.js";
import { UserRepository } from "../../auth/repository/user.repository.js";

/**
 * Creates the stats router.
 * Requires authentication to prevent exposing queue metrics publicly.
 */
export function createStatsRouter(): Router {
  const router = Router();

  const queue = getFileProcessingQueue();
  const statsService = new StatsService(queue);
  const statsController = new StatsController(statsService);

  const redis = getRedisClient();
  const userRepository = new UserRepository(redis);
  const authService = new AuthService(userRepository);
  const authMiddleware = createAuthMiddleware((token) =>
    authService.verifyAccessToken(token),
  );

  /**
   * @openapi
   * /stats:
   *   get:
   *     tags: [Stats]
   *     summary: Get queue statistics
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Queue statistics
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/QueueStats'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  router.get(
    "/",
    authMiddleware,
    apiLimiter,
    asyncHandler(statsController.getStats),
  );

  return router;
}
