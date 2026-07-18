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
  slackRuntimeErrorsChannelId: string | undefined;
};

export function loadSettings(): Settings {
  loadOptionalEnv(join(homedir(), ".config", "homie", "slack.env"));
  loadOptionalEnv(join(homedir(), ".config", "homie", "fb-scrape.env"));

  return {
    temporalAddress: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: process.env.HOMIE_FB_TASK_QUEUE ?? "homie-fb-scrape",
    facebookStatePath:
      process.env.HOMIE_FACEBOOK_STATE_PATH ??
      join(homedir(), ".config", "homie", "facebook_state.json"),
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackRuntimeErrorsChannelId: process.env.SLACK_RUNTIME_ERRORS_CHANNEL_ID,
  };
}
