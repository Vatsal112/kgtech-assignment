/**
 * Express type augmentation.
 * Adds the authenticated JWT payload to `Request` after auth middleware runs.
 */
import type { JwtPayload } from "../../modules/auth/types/jwt-payload.type.js";

declare global {
  namespace Express {
    interface Request {
      /** Populated by auth middleware after a valid JWT is verified. */
      user?: JwtPayload;
    }
  }
}
