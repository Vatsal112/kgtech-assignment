import { Router } from "express";
import { UploadController } from "./upload.controller.js";
import { UploadService } from "../service/upload.service.js";
import { getRedisClient } from "../../../core/redis/redis.client.js";
import { createAuthMiddleware } from "../../../core/middleware/auth.middleware.js";
import { validate } from "../../../core/middleware/validate.middleware.js";
import { uploadLimiter } from "../../../core/middleware/rate-limit.middleware.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import { uploadUrlSchema } from "../dto/upload-url.dto.js";
import { AuthService } from "../../auth/service/auth.service.js";
import { UserRepository } from "../../auth/repository/user.repository.js";

/**
 * Creates the upload router.
 * Requires authentication and AWS S3 configuration for pre-signed URL generation.
 */
export function createUploadRouter(): Router {
  const router = Router();

  const uploadService = new UploadService();
  const uploadController = new UploadController(uploadService);

  const redis = getRedisClient();
  const userRepository = new UserRepository(redis);
  const authService = new AuthService(userRepository);
  const authMiddleware = createAuthMiddleware((token) =>
    authService.verifyAccessToken(token),
  );

  /**
   * @openapi
   * /upload-url:
   *   post:
   *     tags: [Upload]
   *     summary: Generate a pre-signed S3 upload URL
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UploadUrlDto'
   *     responses:
   *       201:
   *         description: Pre-signed URL generated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UploadUrlResponse'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       503:
   *         description: S3 service not configured
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post(
    "/",
    authMiddleware,
    uploadLimiter,
    validate(uploadUrlSchema),
    asyncHandler(uploadController.generateUploadUrl),
  );

  return router;
}
