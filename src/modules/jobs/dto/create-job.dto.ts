/**
 * Create-job request validation schema.
 */
import { z } from "zod";

/** Zod schema for `POST /jobs` request body. */
export const createJobSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename must not exceed 255 characters")
    .regex(/^[a-zA-Z0-9._\-\s]+$/, "Filename contains invalid characters"),
  size: z
    .number({
      required_error: "Size is required",
      invalid_type_error: "Size must be a number",
    })
    .int("Size must be an integer")
    .positive("Size must be a positive number")
    .max(10 * 1024 * 1024 * 1024, "File size cannot exceed 10GB"),
});

export type CreateJobDto = z.infer<typeof createJobSchema>;
