/**
 * AC: mock e2e vitest suite (no live Facebook).
 *
 *   bun run check:e2e-mocks
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { databaseUrl, sh } from "./lib/k8sReady.js";

const FB = join(dirname(fileURLToPath(import.meta.url)), "..");

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
  console.log("ok: e2e-mocks");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
