/**
 * AC: k3s scrape-temporal is Ready and accepts gRPC on TEMPORAL_ADDRESS.
 *
 *   bun run check:temporal
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ensureLocalOverlay,
  findRepoRoot,
  kubectlWaitDeploy,
  sh,
  temporalAddress,
  waitTcp,
  HOMIE_NS,
} from "./lib/k8sReady.js";

async function main(): Promise<void> {
  ensureLocalOverlay();
  kubectlWaitDeploy("scrape-temporal-db", "120s");
  kubectlWaitDeploy("scrape-temporal", "180s");

  const addr = temporalAddress();
  const [h, p] = addr.split(":");
  await waitTcp(h || "127.0.0.1", Number(p || "7233"));

  const ps = sh("kubectl", [
    "-n",
    HOMIE_NS,
    "get",
    "deploy",
    "scrape-temporal",
    "-o",
    "jsonpath={.status.readyReplicas}",
  ]);
  if (ps.code !== 0 || ps.stdout.trim() !== "1") {
    throw new Error(`scrape-temporal not ready: ${ps.stdout}${ps.stderr}`);
  }

  const readme = join(findRepoRoot(), "scrapers/facebook/README.md");
  const text = readFileSync(readme, "utf8");
  if (!text.includes("homie-fb-scrape") || !text.includes("7233")) {
    throw new Error(
      "README must document TEMPORAL_ADDRESS (:7233) and task queue homie-fb-scrape",
    );
  }

  console.log(
    `ok: k3s temporal Ready; listening on ${addr}; queue docs mention homie-fb-scrape`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
