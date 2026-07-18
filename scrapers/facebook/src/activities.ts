import { log } from "@temporalio/activity";
import { loadSettings } from "./config.js";
import { probeFacebookSession } from "./authProbe.js";
import { runScrapePipeline } from "./pipeline/runScrape.js";
import type { RunReport } from "./pipeline/types.js";
import {
  formatAuthFailureMessage,
  postRuntimeError,
  shouldAlertAuth,
} from "./slackNotify.js";

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

/** Activity: auth probe; on failure posts to #homie-runtime-errors. */
export async function probeFacebookAuth(
  input: AuthProbeInput,
): Promise<AuthProbeActivityResult> {
  const settings = loadSettings();
  const result = await probeFacebookSession(settings.facebookStatePath);

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
      await postRuntimeError({
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

/** Activity: cursor → scrape → upsert → watermark. */
export async function scrapeFacebookGroupFeed(
  input: ScrapeGroupActivityInput,
): Promise<RunReport> {
  const settings = loadSettings();
  log.info(`scrape start group=${input.groupId}`);
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
