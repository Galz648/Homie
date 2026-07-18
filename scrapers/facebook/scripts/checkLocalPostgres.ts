/**
 * AC: k3s scrape-postgres is Ready; Drizzle migrations applied; scrape_cursors exists.
 *
 *   bun run check:postgres
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import postgres from "postgres";
import {
  databaseUrl,
  ensureLocalOverlay,
  findRepoRoot,
  kubectlWaitDeploy,
  parseHostPort,
  waitTcp,
} from "./lib/k8sReady.js";

async function main(): Promise<void> {
  ensureLocalOverlay();
  kubectlWaitDeploy("scrape-postgres", "120s");

  const url = databaseUrl();
  const { host, port } = parseHostPort(url);
  await waitTcp(host, port);

  const root = findRepoRoot();
  const migrate = spawnSync(
    "bun",
    [join(root, "scripts/local-db/migrate.ts")],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      encoding: "utf8",
    },
  );
  if (migrate.status !== 0) {
    console.error(migrate.stdout + migrate.stderr);
    process.exit(migrate.status ?? 1);
  }
  process.stdout.write(migrate.stdout);

  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql`
      SELECT 1 AS ok FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'scrape_cursors'
    `;
    if (!rows.length) {
      throw new Error("scrape_cursors missing after drizzle migrate");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  console.log(
    "ok: k3s scrape-postgres Ready; drizzle migrations applied; scrape_cursors present",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
