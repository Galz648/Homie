/**
 * AC: mock e2e vitest suite (no live Facebook) + CF Agent / ingest unit mocks.
 *
 *   bun run check:e2e-mocks
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { databaseUrl, sh } from "./lib/k8sReady.js";

const FB = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(FB, "../..");

async function main(): Promise<void> {
  const testsDir = join(FB, "tests");
  if (
    !existsSync(testsDir) ||
    !readdirSync(testsDir).some((f) => f.endsWith(".test.ts"))
  ) {
    throw new Error("missing tests/*.test.ts");
  }

  const r = sh("bun", ["run", "test:e2e-mocks"], {
    cwd: FB,
    env: { ...process.env, DATABASE_URL: databaseUrl() },
  });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  if (r.code !== 0) process.exit(r.code);
  console.log("ok: e2e-mocks (facebook)");

  const agentDir = join(REPO, "agents/listing-extract");
  const agent = sh("bun", ["run", "check:e2e-mocks"], { cwd: agentDir });
  process.stdout.write(agent.stdout);
  process.stderr.write(agent.stderr);
  if (agent.code !== 0) process.exit(agent.code);
  console.log("ok: e2e-mocks (listing-extract agent)");

  const ingestDir = join(REPO, "services/homie-ingest");
  const ingest = sh("bun", ["test"], { cwd: ingestDir });
  process.stdout.write(ingest.stdout);
  process.stderr.write(ingest.stderr);
  if (ingest.code !== 0) process.exit(ingest.code);
  console.log("ok: e2e-mocks (homie-ingest)");

  console.log("ok: e2e-mocks");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
