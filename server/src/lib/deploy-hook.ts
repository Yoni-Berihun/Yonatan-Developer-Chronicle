import { env } from "../env.js";

let lastTriggeredAt = 0;
const MIN_INTERVAL_MS = 60_000;

/**
 * Asks Vercel to rebuild the frontend so newly published content is included in
 * the prerendered HTML. Debounced, because saving several items in a row should
 * not queue several builds.
 */
export function triggerFrontendRebuild(reason: string): void {
  if (!env.VERCEL_DEPLOY_HOOK_URL) return;

  const now = Date.now();
  if (now - lastTriggeredAt < MIN_INTERVAL_MS) return;
  lastTriggeredAt = now;

  void fetch(env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" })
    .then((response) => {
      if (!response.ok) {
        console.warn(`Deploy hook responded ${response.status} for: ${reason}`);
      }
    })
    .catch((error) => console.warn(`Deploy hook failed for ${reason}:`, error));
}
