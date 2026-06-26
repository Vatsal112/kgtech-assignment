/**
 * Login request validation schema.
 */
import { z } from "zod";

/** Zod schema for `POST /auth/login` request body. */
export const loginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof loginSchema>;
