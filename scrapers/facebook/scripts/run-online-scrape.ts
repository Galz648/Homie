/**
 * Start + wait for one live scrapeFacebookGroup run (online AC helper).
 *
 *   bunx tsx scripts/run-online-scrape.ts --group-id 35819517694
 */
import { writeFile } from "node:fs/promises";
import { Connection, Client } from "@temporalio/client";
import { loadSettings, enabledGroups } from "../src/config.js";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const settings = loadSettings();
  const groups = enabledGroups();
  const groupId =
    argValue("--group-id") ??
    process.env.HOMIE_ONLINE_GROUP_ID ??
    groups[0]?.id;
  if (!groupId) {
    throw new Error("No group id (pass --group-id or configure groups.ts)");
  }
  const group = groups.find((g) => g.id === groupId);
  const groupUrl =
    group?.url ?? `https://www.facebook.com/groups/${groupId}`;

  const workflowId =
    argValue("--workflow-id") ?? `fb-group-${groupId}-online-${Date.now()}`;
  const resultPath =
    process.env.HOMIE_ONLINE_RESULT_PATH ??
    "/tmp/homie-fb-online-e2e-result.json";

  const connection = await Connection.connect({
    address: settings.temporalAddress,
  });
  const client = new Client({
    connection,
    namespace: settings.temporalNamespace,
  });

  console.log(
    `Starting scrapeFacebookGroup workflowId=${workflowId} group=${groupId}`,
  );
  const handle = await client.workflow.start("scrapeFacebookGroup", {
    taskQueue: settings.taskQueue,
    workflowId,
    args: [{ groupId, groupUrl }],
  });

  const result = await handle.result();
  await writeFile(resultPath, JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
  const status = (result as { status?: string })?.status;
  if (status !== "ok" && status !== "empty_suspect") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
