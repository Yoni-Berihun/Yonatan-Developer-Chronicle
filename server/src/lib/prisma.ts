import { PrismaClient } from "@prisma/client";
import { isProduction } from "../env.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

// Reuse the client across development reloads and warm serverless module
// imports. DATABASE_URL must still be a pooled connection in Vercel.
globalForPrisma.prisma = prisma;
