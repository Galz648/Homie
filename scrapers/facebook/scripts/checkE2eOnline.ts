/**
 * AC: live Temporal scrape for configured Facebook group against k3s.
 *
 *   bun run check:e2e-online
 *   bun run preprod:e2e-online  (banner wrapper — scripts/runE2eOnline.ts)
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadSettings } from "../src/config.js";
import {
  databaseUrl,
  sh,
  temporalAddress,
  waitTcp,
} from "./lib/k8sReady.js";

const FB = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_GROUP = "35819517694";
const RESULT_PATH = "/tmp/homie-fb-online-e2e-result.json";

export async function runE2eOnline(): Promise<void> {
  for (const rel of [
    "scripts/checkE2eOnline.ts",
    "scripts/run-online-scrape.ts",
    "src/groups.ts",
  ]) {
    if (!existsSync(join(FB, rel))) throw new Error(`missing ${rel}`);
  }

  const groupId = process.env.HOMIE_ONLINE_GROUP_ID ?? DEFAULT_GROUP;
  const groups = readFileSync(join(FB, "src/groups.ts"), "utf8");
  if (!groups.includes(groupId)) {
    throw new Error(`group ${groupId} not in src/groups.ts`);
  }

  const settings = loadSettings();
  if (!existsSync(settings.facebookStatePath)) {
    throw new Error(
      `missing Facebook state at ${settings.facebookStatePath} — run import-chrome-session or renew`,
    );
  }

  const [th, tp] = temporalAddress().split(":");
  await waitTcp(th || "127.0.0.1", Number(tp || "7233"));

  try {
    unlinkSync(RESULT_PATH);
  } catch {
    /* ok */
  }

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl(),
    TEMPORAL_ADDRESS: temporalAddress(),
    HOMIE_ONLINE_GROUP_ID: groupId,
    HOMIE_ONLINE_RESULT_PATH: RESULT_PATH,
  };

  const worker = spawn("bun", ["run", "worker"], {
    cwd: FB,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let workerLog = "";
  worker.stdout?.on("data", (d) => {
    workerLog += String(d);
  });
  worker.stderr?.on("data", (d) => {
    workerLog += String(d);
  });

  try {
    await new Promise((r) => setTimeout(r, 8000));
    if (worker.exitCode !== null) {
      throw new Error(`worker failed to start:\n${workerLog}`);
    }

    const run = sh(
      "bunx",
      ["tsx", "scripts/run-online-scrape.ts", "--group-id", groupId],
      { cwd: FB, env },
    );
    process.stdout.write(run.stdout);
    process.stderr.write(run.stderr);
    if (run.code !== 0) process.exit(run.code);

    if (!existsSync(RESULT_PATH)) {
      throw new Error(`missing result file ${RESULT_PATH}`);
    }
    const result = JSON.parse(readFileSync(RESULT_PATH, "utf8")) as {
      status?: string;
      report?: { status?: string };
    };
    const status = result.status ?? result.report?.status;
    if (status !== "ok" && status !== "empty_suspect") {
      throw new Error(`unexpected workflow status: ${status}`);
    }

    const sql = postgres(databaseUrl(), { max: 1 });
    try {
      const rows = await sql`
        SELECT "groupId", "lastStatus"::text AS s
        FROM scrape_cursors WHERE "groupId" = ${groupId}
      `;
      if (!rows.length) {
        throw new Error("scrape_cursors row missing after online run");
      }
      console.log(JSON.stringify(rows));
    } finally {
      await sql.end({ timeout: 5 });
    }

    console.log(`ok: e2e-online group=${groupId} status=${status}`);
  } finally {
    worker.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        worker.kill("SIGKILL");
        resolve();
      }, 15_000);
      worker.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

const isDirectRun = process.argv[1]?.includes("checkE2eOnline");
if (isDirectRun) {
  runE2eOnline().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
