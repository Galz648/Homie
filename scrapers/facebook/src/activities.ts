import { log as temporalLog } from "@temporalio/activity";
import { loadSettings, type Settings } from "./config.js";
import {
  probeFacebookSession,
  type AuthProbeResult,
} from "./authProbe.js";
import { runScrapePipeline } from "./pipeline/runScrape.js";
import type { RunReport } from "./pipeline/types.js";
import {
  formatAuthFailureMessage,
  postRuntimeError,
  shouldAlertAuth,
  type RuntimeErrorMessage,
} from "./slackNotify.js";

const log = {
  info: (msg: string) => {
    try {
      temporalLog.info(msg);
    } catch {
      console.info(msg);
    }
  },
  error: (msg: string) => {
    try {
      temporalLog.error(msg);
    } catch {
      console.error(msg);
    }
  },
};

export type AuthProbeInput = {
  groupId: string;
  groupUrl: string;
  workflowId: string;
};

export type AuthProbeActivityResult = {
  status: string;
  detail: string;
  statePath: string;
  slackNotified: boolean;
};

export type ProbeFacebookAuthDeps = {
  settings?: Settings;
  probe?: (statePath: string) => Promise<AuthProbeResult>;
  postError?: (args: {
    botToken: string;
    channelId: string;
    message: RuntimeErrorMessage | string;
  }) => Promise<void>;
};

/** Activity: auth probe; on failure posts to #homie-runtime-errors. */
export async function probeFacebookAuth(
  input: AuthProbeInput,
  deps: ProbeFacebookAuthDeps = {},
): Promise<AuthProbeActivityResult> {
  const settings = deps.settings ?? loadSettings();
  const probe = deps.probe ?? probeFacebookSession;
  const postError = deps.postError ?? postRuntimeError;
  const result = await probe(settings.facebookStatePath);

  let slackNotified = false;
  if (shouldAlertAuth(result.status)) {
    const token = settings.slackBotToken;
    const channel = settings.slackRuntimeErrorsChannelId;
    if (!token || !channel) {
      log.error(
        "Auth failed but Slack not configured (SLACK_BOT_TOKEN / SLACK_RUNTIME_ERRORS_CHANNEL_ID)",
      );
    } else {
      const message = formatAuthFailureMessage({
        groupId: input.groupId,
        groupUrl: input.groupUrl,
        result,
        workflowId: input.workflowId,
      });
      await postError({
        botToken: token,
        channelId: channel,
        message,
      });
      slackNotified = true;
      log.info("Posted auth failure to Slack runtime-errors");
    }
  }

  return {
    status: result.status,
    detail: result.detail,
    statePath: result.statePath,
    slackNotified,
  };
}

export type ScrapeGroupActivityInput = {
  groupId: string;
  groupUrl: string;
};

/**
 * Activity: cursor → scrape → upsert raw posts → watermark.
 *
 * Image path: `loadSettings()` pulls `~/.config/homie/spaces.env` (or lane
 * Secret). When `HOMIE_IMAGE_UPLOAD_MODE=spaces`, upsert downloads feed image
 * URLs and PutObject to DO Spaces; Spaces CDN URLs land in
 * `raw_facebook_posts.images`. Local mocks keep mode=`noop`.
 */
export async function scrapeFacebookGroupFeed(
  input: ScrapeGroupActivityInput,
): Promise<RunReport> {
  const settings = loadSettings();
  log.info(
    `scrape start group=${input.groupId} imageMode=${process.env.HOMIE_IMAGE_UPLOAD_MODE ?? "noop"}`,
  );
  const report = await runScrapePipeline({
    groupId: input.groupId,
    groupUrl: input.groupUrl,
    statePath: settings.facebookStatePath,
  });
  log.info(
    `scrape done group=${input.groupId} status=${report.status} seen=${report.postsSeen} new=${report.postsNew} stop=${report.stopReason} at=${report.finishedAtIsrael}`,
  );
  return report;
}
