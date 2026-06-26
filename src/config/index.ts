/**
 * Environment configuration layer.
 * Loads `.env` values and validates them at startup using Zod.
 */
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  QUEUE_NAME: z.string().default("file-processing"),
  QUEUE_CONCURRENCY: z.string().default("5").transform(Number),

  /** Comma-separated list of allowed browser origins, or `*` for all. */
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000,http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  CORS_CREDENTIALS: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
});

type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parses and validates `process.env` against the schema.
 *
 * @throws {Error} When required variables are missing or invalid.
 */
function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

/** Validated, typed application configuration loaded once at startup. */
export const config = validateEnv();

export type { EnvConfig };
