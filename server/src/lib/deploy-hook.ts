import { env } from "../env.js";

let lastTriggeredAt = 0;
const MIN_INTERVAL_MS = 60_000;

/**
 * Optional webhook after publishing content. Debounced so saving several items
 * in a row does not queue several builds. With the single-service Railway
 * deploy the SPA already reads live API data — this is only useful if you add
 * a separate prerender/CDN step later.
 */
export function triggerFrontendRebuild(reason: string): void {
  if (!env.FRONTEND_DEPLOY_HOOK_URL) return;

  const now = Date.now();
  if (now - lastTriggeredAt < MIN_INTERVAL_MS) return;
  lastTriggeredAt = now;

  void fetch(env.FRONTEND_DEPLOY_HOOK_URL, { method: "POST" })
    .then((response) => {
      if (!response.ok) {
        console.warn(`Deploy hook responded ${response.status} for: ${reason}`);
      }
    })
    .catch((error) => console.warn(`Deploy hook failed for ${reason}:`, error));
}
