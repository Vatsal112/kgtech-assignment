/**
 * Token refresh and logout request validation schema.
 */
import { z } from "zod";

/** Zod schema for `POST /auth/refresh` and `POST /auth/logout` request bodies. */
export const refreshSchema = z.object({
  refreshToken: z.string().uuid("Refresh token must be a valid UUID"),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
