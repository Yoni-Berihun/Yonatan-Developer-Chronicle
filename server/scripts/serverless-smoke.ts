import { createServer } from "node:http";

// Keep this smoke test independent from a live database. The handler factory
// accepts a no-op initializer, while all routing/middleware stays identical to
// the deployed Vercel Function.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.JWT_SECRET ??= "serverless-smoke-secret-at-least-32-characters";
process.env.ADMIN_EMAIL ??= "smoke@example.com";
process.env.PUBLIC_SITE_URL ??= "http://127.0.0.1";

let hookCalls = 0;
const hookServer = createServer((_req, res) => {
  hookCalls += 1;
  setTimeout(() => {
    res.statusCode = 200;
    res.end("ok");
  }, 25);
});

await new Promise<void>((resolve, reject) => {
  hookServer.once("error", reject);
  hookServer.listen(0, "127.0.0.1", resolve);
});
const hookAddress = hookServer.address();
if (!hookAddress || typeof hookAddress === "string") {
  throw new Error("Could not bind deploy-hook smoke server.");
}
process.env.VERCEL_DEPLOY_HOOK_URL = `http://127.0.0.1:${hookAddress.port}/deploy`;

const { createServerlessHandler } = await import("../api/index.js");
const { triggerFrontendRebuild } = await import("../src/lib/deploy-hook.js");
const handler = createServerlessHandler(async () => undefined);

const server = createServer((req, res) => {
  void handler(req as never, res as never);
});

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
if (!address || typeof address === "string") throw new Error("Could not bind smoke server.");
const base = `http://127.0.0.1:${address.port}`;

async function expect(
  label: string,
  path: string,
  status: number,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${base}${path}`, init);
  if (response.status !== status) {
    throw new Error(`${label}: expected ${status}, received ${response.status}`);
  }
  console.log(`PASS ${label} (${status})`);
  return response;
}

try {
  const health = await expect("serverless health route", "/health", 200);
  const healthJson = (await health.json()) as { ok?: boolean; env?: string };
  if (healthJson.ok !== true || healthJson.env !== "test") {
    throw new Error(`health payload was unexpected: ${JSON.stringify(healthJson)}`);
  }

  await expect("unknown API route", "/api/does-not-exist", 404);
  await expect("nested protected API route", "/api/admin/sections", 401);
  await expect("auth session probe", "/api/auth/me", 401);
  await expect("malformed JSON handling", "/api/contact", 400, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

  await triggerFrontendRebuild("serverless smoke test");
  if (hookCalls !== 1) {
    throw new Error(`deploy hook: expected 1 call, received ${hookCalls}`);
  }
  console.log("PASS awaited frontend deploy hook");

  console.log("Serverless smoke checks passed.");
} finally {
  await Promise.all(
    [server, hookServer].map(
      (runningServer) =>
        new Promise<void>((resolve, reject) => {
          runningServer.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
}
