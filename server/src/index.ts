import { createApp } from "./app.js";
import { ensureAdminUser } from "./bootstrap.js";
import { env } from "./env.js";
import { prisma } from "./lib/prisma.js";

async function main() {
  await ensureAdminUser();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(`The Yonatan Times API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.info(`${signal} received, shutting down.`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
    // Render sends SIGTERM and waits ~30s; don't hang if a socket is stuck.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("Failed to start the API:", error);
  process.exit(1);
});
