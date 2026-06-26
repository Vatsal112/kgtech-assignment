/**
 * S3 pre-signed upload URL request/response schemas.
 */
import { z } from "zod";

/** Zod schema for `POST /upload-url` request body. */
export const uploadUrlSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename must not exceed 255 characters"),
  contentType: z
    .string()
    .min(1, "Content type is required")
    .regex(/^[\w-]+\/[\w\-+.]+$/, "Invalid content type format"),
});

export type UploadUrlDto = z.infer<typeof uploadUrlSchema>;

/** Response containing the pre-signed URL and S3 object key. */
export interface UploadUrlResponseDto {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}
