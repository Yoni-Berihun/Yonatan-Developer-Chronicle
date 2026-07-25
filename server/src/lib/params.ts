import type { Request } from "express";
import { badRequest } from "./http-error.js";

/**
 * Express 5 types route params as `string | string[] | undefined`. Narrowing at
 * the call site keeps Prisma's generic inference intact and turns a malformed
 * URL into a clean 400 instead of a confusing query error.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw badRequest(`Missing or invalid route parameter: ${name}`);
  }
  return value;
}
