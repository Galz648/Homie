import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import alchemy from "alchemy";
import { GitHubComment } from "alchemy/github";
import { CloudflareStateStore } from "alchemy/state";
import { Vite } from "alchemy/cloudflare";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env") });
config({ path: resolve(__dirname, "../.env") });

const app = await alchemy("Homie-Website", {
  stateStore: process.env.ALCHEMY_STATE_TOKEN
    ? (scope) => new CloudflareStateStore(scope)
    : undefined,
});

export const worker = await Vite("website", {
  entrypoint: "src/worker.ts",
  bindings: {
    DATABASE_URL: alchemy.secret(process.env.DATABASE_URL!),
  },
  wrangler: {
    transform: (spec) => ({
      ...spec,
      compatibility_flags: ["nodejs_compat_v2"],
      assets: {
        ...spec.assets,
        run_worker_first: ["/api/*"],
      },
    }),
  },
});

console.log({
  url: worker.url,
});

if (process.env.PULL_REQUEST) {
  const previewUrl = worker.url;

  await GitHubComment("pr-preview-comment", {
    owner: process.env.GITHUB_REPOSITORY_OWNER || "your-username",
    repository: process.env.GITHUB_REPOSITORY_NAME || "Homie-Website",
    issueNumber: Number(process.env.PULL_REQUEST),
    body: `
## 🚀 Preview Deployed

Your preview is ready!

**Preview URL:** ${previewUrl}

This preview was built from commit ${process.env.GITHUB_SHA}

---
<sub>🤖 This comment will be updated automatically when you push new commits to this PR.</sub>`,
  });
}

await app.finalize();
