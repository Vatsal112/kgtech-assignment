/**
 * S3 upload service.
 * Generates pre-signed PUT URLs so clients can upload files directly to S3.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  UploadUrlDto,
  UploadUrlResponseDto,
} from "../dto/upload-url.dto.js";
import { config } from "../../../config/index.js";
import { ServiceUnavailableError } from "../../../core/errors/index.js";
import { logger } from "../../../core/logger/logger.js";

/** Pre-signed URLs expire after 15 minutes. */
const PRESIGNED_URL_EXPIRES_IN = 900;

export class UploadService {
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: config.AWS_REGION,
      ...(config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
  }

  /**
   * Generates a pre-signed S3 PUT URL for direct client-side file upload.
   *
   * @throws {ServiceUnavailableError} When `AWS_S3_BUCKET` is not configured.
   */
  async generateUploadUrl(
    dto: UploadUrlDto,
    userId: string,
  ): Promise<UploadUrlResponseDto> {
    if (!config.AWS_S3_BUCKET) {
      throw new ServiceUnavailableError("S3 upload service is not configured");
    }

    const ext = dto.filename.includes(".") ? dto.filename.split(".").pop() : "";
    const key = `uploads/${dto.filename}${ext ? `.${ext}` : ""}`;

    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    });

    logger.info("Pre-signed upload URL generated", { userId, key });

    return {
      uploadUrl,
      key,
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    };
  }
}
