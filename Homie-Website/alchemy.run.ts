import alchemy from "alchemy";
import { GitHubComment } from "alchemy/github";
import { CloudflareStateStore } from "alchemy/state";
import { BunSPA } from "alchemy/cloudflare";

const app = await alchemy("Homie-Website", {
  stateStore: process.env.ALCHEMY_STATE_TOKEN
    ? (scope) => new CloudflareStateStore(scope)
    : undefined,
});

export const bunsite = await BunSPA("homie-site", {
  entrypoint: "src/worker.ts",
  frontend: ["src/index.html"],
});

console.log({
  url: bunsite.url,
  apiUrl: bunsite.apiUrl,
});

if (process.env.PULL_REQUEST) {
  const previewUrl = bunsite.url;

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
