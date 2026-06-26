/**
 * JWT authentication middleware factory.
 * Extracts the Bearer token, verifies it, and attaches the user payload to `req.user`.
 */
import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../errors/index.js";

type TokenVerifier = (token: string) => { sub: string; email: string };

/**
 * Creates middleware that protects routes requiring a valid JWT access token.
 *
 * @param verifyToken - Function that validates the token and returns the JWT payload.
 */
export function createAuthMiddleware(verifyToken: TokenVerifier) {
  return function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next(new UnauthorizedError("Authorization header missing or malformed"));
      return;
    }

    const token = authHeader.slice(7);

    if (!token) {
      next(new UnauthorizedError("Token not provided"));
      return;
    }

    try {
      const payload = verifyToken(token);
      req.user = { sub: payload.sub, email: payload.email };
      next();
    } catch (err) {
      next(err);
    }
  };
}
