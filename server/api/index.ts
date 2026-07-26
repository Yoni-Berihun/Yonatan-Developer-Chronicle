import type { Request, Response } from "express";
import { createApp } from "../src/app.js";
import { ensureAdminUser } from "../src/bootstrap.js";

const app = createApp();
const initialized = ensureAdminUser();

/**
 * Vercel invokes this module as a serverless function. Keep initialization
 * outside the handler so warm instances reuse both Express and Prisma.
 */
export default async function handler(req: Request, res: Response) {
  await initialized;
  return app(req, res);
}
