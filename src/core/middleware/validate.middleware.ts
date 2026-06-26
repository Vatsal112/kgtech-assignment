/**
 * Zod request validation middleware.
 * Parses and replaces `req.body`, `req.params`, or `req.query` with validated data.
 */
import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

type RequestPart = "body" | "params" | "query";

/**
 * Returns middleware that validates a request part against a Zod schema.
 * On failure, forwards the ZodError to the global error handler.
 *
 * @param schema - Zod schema to validate against.
 * @param part - Which part of the request to validate (defaults to `body`).
 */
export function validate(schema: ZodType<unknown>, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      next(result.error);
      return;
    }

    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
}
