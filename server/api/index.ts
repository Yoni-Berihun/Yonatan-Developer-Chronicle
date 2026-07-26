import type { Request, Response } from "express";
import { createApp } from "../src/app.js";
import { ensureAdminUser } from "../src/bootstrap.js";

type Initializer = () => Promise<void>;

export function createServerlessHandler(initializer: Initializer = ensureAdminUser) {
  const app = createApp();
  let initialization: Promise<void> | undefined;

  return async function handler(req: Request, res: Response) {
    if (!initialization) {
      initialization = initializer().catch((error: unknown) => {
        // A transient database wake-up must not poison this warm function
        // instance forever. Let the next request retry initialization.
        initialization = undefined;
        throw error;
      });
    }

    await initialization;
    return app(req, res);
  };
}

/**
 * Vercel invokes this module as a serverless function. The handler and its
 * initialization promise live at module scope so warm instances reuse Express
 * and Prisma.
 */
export default createServerlessHandler();
