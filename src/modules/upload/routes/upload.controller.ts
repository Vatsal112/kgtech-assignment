/**
 * Upload HTTP controller.
 */
import type { Request, Response } from "express";
import type { UploadService } from "../service/upload.service.js";
import type { UploadUrlDto } from "../dto/upload-url.dto.js";
import { createdResponse } from "../../../shared/utils/response.util.js";
import { UnauthorizedError } from "../../../core/errors/index.js";

export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /** `POST /upload-url` — returns a pre-signed S3 URL for direct file upload. */
  generateUploadUrl = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = req.body as UploadUrlDto;
    const result = await this.uploadService.generateUploadUrl(
      dto,
      req.user.sub,
    );
    res
      .status(201)
      .json(createdResponse(result, "Pre-signed upload URL generated"));
  };
}
