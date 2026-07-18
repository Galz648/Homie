/**
 * AC: scrape-pipeline modules + typecheck + cursor smoke against k3s Postgres.
 *
 *   bun run check:pipeline
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSql,
  ensureCursor,
  loadCursor,
  markRunOutcome,
} from "../src/pipeline/cursor.js";
import { databaseUrl, sh } from "./lib/k8sReady.js";

const FB = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const required = [
    "src/activities.ts",
    "src/workflows.ts",
    "src/scrapeRunPolicy.ts",
    "src/pipeline/runScrape.ts",
    "src/pipeline/cursor.ts",
    "src/pipeline/scrapeFeed.ts",
    "src/pipeline/upsertListings.ts",
    "src/pipeline/images.ts",
    "scripts/checkScrapePipeline.ts",
  ];
  for (const rel of required) {
    if (!existsSync(join(FB, rel))) throw new Error(`missing ${rel}`);
  }

  const tc = sh("bun", ["run", "typecheck"], { cwd: FB });
  if (tc.code !== 0) {
    console.error(tc.stdout + tc.stderr);
    process.exit(tc.code);
  }

  const url = databaseUrl();
  const sql = createSql(url);
  const g = "ac-scrape-pipeline-smoke";
  try {
    await ensureCursor(sql, g, `https://www.facebook.com/groups/${g}`);
    await markRunOutcome(sql, {
      groupId: g,
      groupUrl: `https://www.facebook.com/groups/${g}`,
      status: "ok",
      postsSeen: 1,
      postsNew: 1,
      lastPostId: "smoke-post-1",
      lastPostedAt: new Date(),
      advanceWatermark: true,
    });
    const row = await loadCursor(sql, g);
    if (!row || row.lastPostId !== "smoke-post-1") {
      throw new Error(`cursor watermark not advanced: ${JSON.stringify(row)}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  console.log("ok: scrape-pipeline modules + typecheck + cursor smoke");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
