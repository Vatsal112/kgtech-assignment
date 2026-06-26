import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { config } from "../config/index.js";
import { logger } from "../core/logger/logger.js";

/** OpenAPI 3.0 specification served at `/api-docs` and `/api-docs.json`. */
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "File Processing Service API",
    version: "1.0.0",
    description:
      "A production-ready File Processing Service using Node.js, TypeScript, Express, Redis, and BullMQ.",
    contact: {
      name: "API Support",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}/api/v1`,
      description: "Local development server",
    },
    {
      url: "https://your-production-domain.com/api/v1",
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT access token",
      },
    },
    schemas: {
      RegisterDto: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: {
            type: "string",
            minLength: 8,
            example: "SecurePass1",
            description:
              "Must be at least 8 chars with 1 uppercase and 1 number",
          },
        },
      },
      LoginDto: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: { type: "string", example: "SecurePass1" },
        },
      },
      RefreshDto: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: {
            type: "string",
            format: "uuid",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
        },
      },
      AuthTokens: {
        type: "object",
        properties: {
          accessToken: {
            type: "string",
            description: "JWT access token (15m)",
          },
          refreshToken: {
            type: "string",
            format: "uuid",
            description: "Refresh token (7d)",
          },
          expiresIn: { type: "string", example: "15m" },
        },
      },
      UserPublic: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/UserPublic" },
              tokens: { $ref: "#/components/schemas/AuthTokens" },
            },
          },
        },
      },
      CreateJobDto: {
        type: "object",
        required: ["filename", "size"],
        properties: {
          filename: {
            type: "string",
            example: "orders.csv",
            description: "Name of the file to process",
          },
          size: {
            type: "integer",
            example: 1024,
            description: "File size in bytes",
          },
        },
      },
      CreateJobResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              jobId: { type: "string", format: "uuid" },
              status: {
                type: "string",
                enum: ["queued"],
                example: "queued",
              },
            },
          },
        },
      },
      JobStatusResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              jobId: { type: "string", format: "uuid" },
              filename: { type: "string", example: "orders.csv" },
              size: { type: "integer", example: 1024 },
              status: {
                type: "string",
                enum: ["queued", "active", "completed", "failed"],
              },
              createdAt: { type: "string", format: "date-time" },
              completedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
              },
              failedAt: { type: "string", format: "date-time", nullable: true },
              attempts: { type: "integer", example: 1 },
              errorMessage: { type: "string", nullable: true },
            },
          },
        },
      },
      QueueStats: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              waiting: { type: "integer", example: 5 },
              active: { type: "integer", example: 2 },
              completed: { type: "integer", example: 15 },
              failed: { type: "integer", example: 3 },
              delayed: { type: "integer", example: 0 },
            },
          },
        },
      },
      UploadUrlDto: {
        type: "object",
        required: ["filename", "contentType"],
        properties: {
          filename: { type: "string", example: "data.csv" },
          contentType: { type: "string", example: "text/csv" },
        },
      },
      UploadUrlResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              uploadUrl: {
                type: "string",
                format: "uri",
                description: "Pre-signed S3 URL for direct upload",
              },
              key: { type: "string", example: "uploads/userId/uuid.csv" },
              expiresIn: {
                type: "integer",
                example: 900,
                description: "Seconds until URL expires",
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          statusCode: { type: "integer" },
          details: { type: "array", items: { type: "object" }, nullable: true },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Validation failed",
              statusCode: 400,
              details: [
                { field: "email", message: "Must be a valid email address" },
              ],
            },
          },
        },
      },
      UnauthorizedError: {
        description: "Authentication required or token invalid",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Authentication required",
              statusCode: 401,
            },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Job with id 'xyz' not found",
              statusCode: 404,
            },
          },
        },
      },
      ConflictError: {
        description: "Resource already exists",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      TooManyRequests: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Too many requests, please slow down",
              statusCode: 429,
            },
          },
        },
      },
    },
  },
  tags: [
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Jobs", description: "File processing job management" },
    { name: "Stats", description: "Queue statistics" },
    { name: "Upload", description: "S3 pre-signed URL generation" },
    { name: "Health", description: "Service health checks" },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    "./src/modules/**/routes/*.router.ts",
    "./src/modules/**/routes/*.router.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Mounts Swagger UI and the raw OpenAPI JSON spec on the Express app.
 *
 * @param app - Express application instance.
 */
export function setupSwagger(app: Express): void {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "File Processing Service API",
      customCss: ".swagger-ui .topbar { display: none }",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  );

  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(swaggerSpec);
  });

  logger.info("Swagger UI available at /api-docs");
}
