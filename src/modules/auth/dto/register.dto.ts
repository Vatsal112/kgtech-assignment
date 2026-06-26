/**
 * Registration request validation schema.
 */
import { z } from "zod";

/** Zod schema for `POST /auth/register` request body. */
export const registerSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type RegisterDto = z.infer<typeof registerSchema>;
