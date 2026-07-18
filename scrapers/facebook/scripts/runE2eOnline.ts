/**
 * Manual live Facebook e2e (pre-prod gate).
 *
 * Policy (docs/workstreams.md W7):
 *   - mocks  → automated CI / every PR (`bun run check:e2e-mocks`)
 *   - live   → THIS entrypoint, operator-activated only — before promoting scrape to prod
 *   - live is NOT a blocking staging CI step
 *
 *   bun run preprod:e2e-online
 *   bunx tsx scripts/runE2eOnline.ts
 */
import { runE2eOnline } from "./checkE2eOnline.js";

async function main(): Promise<void> {
  console.log("== Homie live e2e (manual / pre-prod) ==");
  console.log("This hits real Facebook. Not for automatic CI.");
  console.log("");
  console.log("Prerequisites: k3s Postgres+Temporal, facebook_state.json");
  console.log("  (import-chrome-session or renew). Optional HOMIE_ONLINE_GROUP_ID.");
  console.log("");

  await runE2eOnline();

  console.log("");
  console.log(
    "ok: live e2e finished — safe to promote scrape if this was your pre-prod gate",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
