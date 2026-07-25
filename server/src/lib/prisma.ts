import { PrismaClient } from "@prisma/client";
import { isProduction } from "../env.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

// `tsx watch` re-imports modules on every change; reusing the client keeps the
// connection pool from growing without bound during development.
if (!isProduction) globalForPrisma.prisma = prisma;
