import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { isProduction } from "../env.js";
import { HttpError } from "../lib/http-error.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}` });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ") ?? "value";
      res.status(409).json({ error: `That ${target} is already taken.` });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: "That record no longer exists." });
      return;
    }
  }

  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Something went wrong on our end.",
    ...(isProduction ? {} : { detail: error instanceof Error ? error.message : String(error) }),
  });
}
