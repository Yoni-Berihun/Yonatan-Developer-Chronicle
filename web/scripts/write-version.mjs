import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const output = {
  commit:
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.GIT_COMMIT ??
    "local",
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  builtAt: new Date().toISOString(),
};

await writeFile(join(here, "..", "dist", "version.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote frontend version marker for ${output.commit}.`);
