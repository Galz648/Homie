import { config as loadDotenv } from "dotenv";
import { homedir } from "node:os";
import { join } from "node:path";
import { enabledGroups, facebookGroups, type FacebookGroup } from "./groups.js";

export type { FacebookGroup };
export { facebookGroups, enabledGroups };
export { scrapeRunPolicy } from "./scrapeRunPolicy.js";

function loadOptionalEnv(path: string): void {
  loadDotenv({ path, override: false });
}

export type Settings = {
  temporalAddress: string;
  temporalNamespace: string;
  taskQueue: string;
  facebookStatePath: string;
  slackBotToken: string | undefined;
  /** Lane-aware: staging → SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID, else prod. */
  slackRuntimeErrorsChannelId: string | undefined;
  /** `local` | `staging` | `production` (from HOMIE_LANE or HOMIE_ENV). */
  lane: string;
};

/** Resolve which Slack runtime-errors channel to use for this lane. */
export function resolveRuntimeErrorsChannelId(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const lane = (env.HOMIE_LANE ?? env.HOMIE_ENV ?? "local").toLowerCase();
  if (lane === "staging") {
    // Never fall back to prod channel on staging.
    return env.SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID?.trim() || undefined;
  }
  return env.SLACK_RUNTIME_ERRORS_CHANNEL_ID?.trim() || undefined;
}

export function loadSettings(): Settings {
  loadOptionalEnv(join(homedir(), ".config", "homie", "slack.env"));
  loadOptionalEnv(join(homedir(), ".config", "homie", "fb-scrape.env"));
  // Spaces upload env for Temporal scrape activity (`HOMIE_IMAGE_UPLOAD_MODE=spaces`).
  loadOptionalEnv(join(homedir(), ".config", "homie", "spaces.env"));

  const lane = (
    process.env.HOMIE_LANE ??
    process.env.HOMIE_ENV ??
    "local"
  ).toLowerCase();

  return {
    temporalAddress: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: process.env.HOMIE_FB_TASK_QUEUE ?? "homie-fb-scrape",
    facebookStatePath:
      process.env.HOMIE_FACEBOOK_STATE_PATH ??
      join(homedir(), ".config", "homie", "facebook_state.json"),
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackRuntimeErrorsChannelId: resolveRuntimeErrorsChannelId(),
    lane,
  };
}
