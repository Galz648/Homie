import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as activities from "./activities.js";
import { loadSettings } from "./config.js";
import { ensureScrapeSchedules } from "./ensureSchedules.js";

async function main(): Promise<void> {
  const settings = loadSettings();

  // Idempotent: create/update schedules (~every 4h, 09–21 Asia/Jerusalem).
  await ensureScrapeSchedules(settings);

  const connection = await NativeConnection.connect({
    address: settings.temporalAddress,
  });

  const workflowsPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "workflows.ts",
  );

  const worker = await Worker.create({
    connection,
    namespace: settings.temporalNamespace,
    taskQueue: settings.taskQueue,
    workflowsPath,
    activities,
  });

  console.log(
    `Homie FB worker on ${settings.temporalAddress} ns=${settings.temporalNamespace} queue=${settings.taskQueue}`,
  );
  await worker.run();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
