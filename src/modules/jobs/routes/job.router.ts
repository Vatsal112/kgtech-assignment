import { Router } from 'express';
import { JobController } from './job.controller.js';
import { JobService } from '../service/job.service.js';
import { JobRepository } from '../repository/job.repository.js';
import { getRedisClient } from '../../../core/redis/redis.client.js';
import { getFileProcessingQueue } from '../../../core/queue/queue.factory.js';
import { createAuthMiddleware } from '../../../core/middleware/auth.middleware.js';
import { validate } from '../../../core/middleware/validate.middleware.js';
import { apiLimiter } from '../../../core/middleware/rate-limit.middleware.js';
import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { createJobSchema } from '../dto/create-job.dto.js';
import { AuthService } from '../../auth/service/auth.service.js';
import { UserRepository } from '../../auth/repository/user.repository.js';

/**
 * Creates the jobs router.
 * All routes require authentication and are rate-limited.
 */
export function createJobRouter(): Router {
  const router = Router();

  const redis = getRedisClient();
  const jobRepository = new JobRepository(redis);
  const queue = getFileProcessingQueue();
  const jobService = new JobService(jobRepository, queue);
  const jobController = new JobController(jobService);

  const userRepository = new UserRepository(redis);
  const authService = new AuthService(userRepository);
  const authMiddleware = createAuthMiddleware((token) => authService.verifyAccessToken(token));

  router.use(authMiddleware);
  router.use(apiLimiter);

  /**
   * @openapi
   * /jobs:
   *   post:
   *     tags: [Jobs]
   *     summary: Create and queue a new file processing job
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateJobDto'
   *     responses:
   *       201:
   *         description: Job created and queued
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CreateJobResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post('/', validate(createJobSchema), asyncHandler(jobController.createJob));

  /**
   * @openapi
   * /jobs/{id}:
   *   get:
   *     tags: [Jobs]
   *     summary: Get the status of a job
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The job ID
   *     responses:
   *       200:
   *         description: Job status retrieved
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/JobStatusResponse'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/:id', asyncHandler(jobController.getJob));

  return router;
}
