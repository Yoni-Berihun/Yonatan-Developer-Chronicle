import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { env } from "./env.js";
import { prisma } from "./lib/prisma.js";

/**
 * Guarantees there is exactly one way in on a fresh database. If no admin
 * exists, create one from ADMIN_EMAIL/ADMIN_PASSWORD; when no password is
 * supplied we generate one and print it once so the deploy is never left
 * without credentials.
 */
export async function ensureAdminUser(): Promise<void> {
  const existing = await prisma.adminUser.count();
  if (existing > 0) return;

  const password = env.ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");

  await prisma.adminUser.create({
    data: {
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      name: env.ADMIN_NAME,
    },
  });

  if (!env.ADMIN_PASSWORD) {
    console.warn(
      [
        "",
        "=".repeat(70),
        "  An admin account was created because none existed.",
        `  Email:    ${env.ADMIN_EMAIL}`,
        `  Password: ${password}`,
        "  Save this now — it will not be shown again.",
        "  Set ADMIN_PASSWORD in your environment to control it yourself.",
        "=".repeat(70),
        "",
      ].join("\n"),
    );
  } else {
    console.info(`Created admin account for ${env.ADMIN_EMAIL}.`);
  }
}
