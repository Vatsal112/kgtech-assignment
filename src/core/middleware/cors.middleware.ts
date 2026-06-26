/**
 * CORS middleware.
 * Restricts cross-origin browser requests to configured frontend origins.
 */
import cors from "cors";
import type { CorsOptions } from "cors";
import type { RequestHandler } from "express";
import { config } from "../../config/index.js";

/**
 * Builds CORS options from environment configuration.
 * Requests without an `Origin` header (curl, Postman, server-to-server) are allowed.
 */
function buildCorsOptions(): CorsOptions {
  const allowedOrigins = config.CORS_ORIGIN;

  return {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: config.CORS_CREDENTIALS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86_400,
  };
}

/** Express middleware that applies CORS headers to all routes. */
export const corsMiddleware: RequestHandler = cors(buildCorsOptions());
