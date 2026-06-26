import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "../service/auth.service.js";
import { UserRepository } from "../repository/user.repository.js";
import { getRedisClient } from "../../../core/redis/redis.client.js";
import { createAuthMiddleware } from "../../../core/middleware/auth.middleware.js";
import { validate } from "../../../core/middleware/validate.middleware.js";
import { authLimiter } from "../../../core/middleware/rate-limit.middleware.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import { registerSchema } from "../dto/register.dto.js";
import { loginSchema } from "../dto/login.dto.js";
import { refreshSchema } from "../dto/refresh.dto.js";

/**
 * Creates the authentication router with rate limiting and validation applied per route.
 */
export function createAuthRouter(): Router {
  const router = Router();

  const userRepository = new UserRepository(getRedisClient());
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  const authMiddleware = createAuthMiddleware((token) =>
    authService.verifyAccessToken(token),
  );

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterDto'
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       409:
   *         $ref: '#/components/responses/ConflictError'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post(
    "/register",
    authLimiter,
    validate(registerSchema),
    asyncHandler(authController.register),
  );

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login with email and password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginDto'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post(
    "/login",
    authLimiter,
    validate(loginSchema),
    asyncHandler(authController.login),
  );

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Refresh access token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshDto'
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  router.post(
    "/refresh",
    validate(refreshSchema),
    asyncHandler(authController.refresh),
  );

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout (invalidate refresh token)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshDto'
   *     responses:
   *       200:
   *         description: Logged out successfully
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  router.post(
    "/logout",
    authMiddleware,
    validate(refreshSchema),
    asyncHandler(authController.logout),
  );

  /**
   * @openapi
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current authenticated user info
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user info
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  router.get("/me", authMiddleware, authController.me);

  return router;
}
