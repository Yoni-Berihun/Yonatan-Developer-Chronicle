import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { badRequest } from "../lib/http-error.js";

/**
 * Replaces req.body with the parsed value so downstream handlers get the
 * narrowed type and any unknown keys are dropped.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        badRequest(
          "Some fields need attention.",
          result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        ),
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}
