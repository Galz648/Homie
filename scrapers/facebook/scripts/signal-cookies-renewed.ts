/**
 * Signal parked scrapeFacebookGroup workflows that cookies were renewed.
 *
 *   bun run signal-cookies-renewed -- --workflow-id fb-group-35819517694
 *   bun run signal-cookies-renewed -- --all-running
 *   bun run signal-cookies-renewed -- --dry-run --workflow-id fb-group-TEST
 */
import { Connection, Client } from "@temporalio/client";
import { loadSettings } from "../src/config.js";

/** Must match `defineSignal("cookies_renewed")` in workflows.ts */
const COOKIES_RENEWED = "cookies_renewed";

type Args = {
  workflowId?: string;
  allRunning: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { allRunning: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--workflow-id" || a === "-w") {
      out.workflowId = argv[++i];
    } else if (a === "--all-running") {
      out.allRunning = true;
    } else if (a === "--dry-run") {
      out.dryRun = true;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  bun run signal-cookies-renewed -- --workflow-id <id>
  bun run signal-cookies-renewed -- --all-running
  bun run signal-cookies-renewed -- --dry-run --workflow-id <id>
`);
      process.exit(0);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.workflowId && !args.allRunning) {
    throw new Error("Pass --workflow-id <id> or --all-running (see --help)");
  }

  const settings = loadSettings();
  const connection = await Connection.connect({
    address: settings.temporalAddress,
  });
  const client = new Client({
    connection,
    namespace: settings.temporalNamespace,
  });

  const ids: string[] = [];
  if (args.workflowId) {
    ids.push(args.workflowId);
  }
  if (args.allRunning) {
    const query = `TaskQueue = "${settings.taskQueue}" AND ExecutionStatus = "Running"`;
    for await (const wf of client.workflow.list({ query })) {
      ids.push(wf.workflowId);
    }
  }

  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    console.log("No matching workflows to signal.");
    return;
  }

  for (const workflowId of unique) {
    if (args.dryRun) {
      console.log(`[dry-run] would signal cookies_renewed → ${workflowId}`);
      continue;
    }
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(COOKIES_RENEWED);
    console.log(`Signaled cookies_renewed → ${workflowId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
