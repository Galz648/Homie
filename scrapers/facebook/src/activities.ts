import { log as temporalLog } from "@temporalio/activity";
import { loadSettings, type Settings } from "./config.js";
import {
  probeFacebookSession,
  type AuthProbeResult,
} from "./authProbe.js";
import {
  DEFAULT_LISTING_EXTRACT_INSTRUCTIONS,
  DEFAULT_LISTING_OUTPUT_SCHEMA,
  notifyListingAgent,
  type NotifyListingAgentDeps,
  type NotifyListingAgentPayload,
  type NotifyListingAgentResult,
} from "./notifyListingAgent.js";
import { runScrapePipeline } from "./pipeline/runScrape.js";
import { createSql } from "./pipeline/cursor.js";
import type { RunReport } from "./pipeline/types.js";
import {
  formatAuthFailureMessage,
  formatNewPostingMessage,
  formatScrapeFailureMessage,
  postNewPosting,
  postRuntimeError,
  shouldAlertAuth,
  shouldAlertScrape,
  type NewPostingMessage,
  type RuntimeErrorMessage,
} from "./slackNotify.js";

export type ListingForAgent = {
  postId: string;
  text: string;
  url: string;
};

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
        "Auth failed but Slack not configured (SLACK_BOT_TOKEN / SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID for staging, or SLACK_RUNTIME_ERRORS_CHANNEL_ID)",
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
  workflowId?: string;
};

export type ScrapeFacebookGroupFeedDeps = {
  settings?: Settings;
  run?: (args: {
    groupId: string;
    groupUrl: string;
    statePath: string;
  }) => Promise<RunReport>;
  postError?: (args: {
    botToken: string;
    channelId: string;
    message: RuntimeErrorMessage | string;
  }) => Promise<void>;
  postPosting?: (args: {
    botToken: string;
    channelId: string;
    message: NewPostingMessage | string;
  }) => Promise<void>;
};

/**
 * Activity: cursor → scrape → upsert raw posts → watermark.
 *
 * Image path: `loadSettings()` pulls `~/.config/homie/spaces.env` (or lane
 * Secret). When `HOMIE_IMAGE_UPLOAD_MODE=spaces`, upsert downloads feed image
 * URLs with Facebook session cookies + Referer/UA, then PutObject to DO Spaces;
 * Spaces CDN URLs land in `raw_facebook_posts.images`. Local mocks keep mode=`noop`.
 *
 * Non-ok reports (crash, empty_suspect, …) post to `#homie-runtime-errors`.
 *
 * On ok + postsNew > 0: posts each new listing to the lane `#homie-raw-postings*`
 * channel, and returns `newListings` so the workflow can FF-notify the CF Agent.
 */
export async function scrapeFacebookGroupFeed(
  input: ScrapeGroupActivityInput,
  deps: ScrapeFacebookGroupFeedDeps = {},
): Promise<
  RunReport & {
    slackNotified: boolean;
    slackPostingsNotified: number;
    newListings: ListingForAgent[];
  }
> {
  const settings = deps.settings ?? loadSettings();
  const run = deps.run ?? runScrapePipeline;
  const postError = deps.postError ?? postRuntimeError;
  const postPosting = deps.postPosting ?? postNewPosting;
  log.info(
    `scrape start group=${input.groupId} imageMode=${process.env.HOMIE_IMAGE_UPLOAD_MODE ?? "noop"}`,
  );
  const report = await run({
    groupId: input.groupId,
    groupUrl: input.groupUrl,
    statePath: settings.facebookStatePath,
  });
  log.info(
    `scrape done group=${input.groupId} status=${report.status} seen=${report.postsSeen} new=${report.postsNew} stop=${report.stopReason} at=${report.finishedAtIsrael}`,
  );

  let slackNotified = false;
  if (shouldAlertScrape(report.status)) {
    const token = settings.slackBotToken;
    const channel = settings.slackRuntimeErrorsChannelId;
    if (!token || !channel) {
      log.error(
        `Scrape ${report.status} but Slack not configured (SLACK_BOT_TOKEN / SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID for staging, or SLACK_RUNTIME_ERRORS_CHANNEL_ID)`,
      );
    } else {
      const message = formatScrapeFailureMessage({
        report,
        groupUrl: input.groupUrl,
        workflowId: input.workflowId,
      });
      await postError({
        botToken: token,
        channelId: channel,
        message,
      });
      slackNotified = true;
      log.info(`Posted scrape ${report.status} to Slack runtime-errors`);
    }
  }

  let newListings: ListingForAgent[] = [];
  if (report.status === "ok" && report.postsNew > 0) {
    try {
      const sql = createSql();
      try {
        const rows = await sql<
          { postId: string; text: string; url: string }[]
        >`
          SELECT "postId", description AS text, url
          FROM raw_facebook_posts
          WHERE "groupId" = ${input.groupId}
          ORDER BY "updatedAt" DESC
          LIMIT ${report.postsNew}
        `;
        newListings = rows.map((r) => ({
          postId: r.postId,
          text: r.text,
          url: r.url,
        }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`failed loading newListings for agent notify: ${msg}`);
    }
  }

  let slackPostingsNotified = 0;
  if (report.status === "ok" && report.postsNew > 0) {
    const token = settings.slackBotToken;
    const channel = settings.slackRawPostingsChannelId;
    if (!token || !channel) {
      log.error(
        `Scrape found ${report.postsNew} new post(s) but Slack raw-postings not configured (SLACK_BOT_TOKEN / SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID for staging, or SLACK_RAW_POSTINGS_CHANNEL_ID)`,
      );
    } else if (newListings.length > 0) {
      for (const listing of newListings) {
        try {
          await postPosting({
            botToken: token,
            channelId: channel,
            message: formatNewPostingMessage({
              postId: listing.postId,
              text: listing.text,
              url: listing.url,
              groupId: input.groupId,
              groupUrl: input.groupUrl,
              env: settings.lane,
            }),
          });
          slackPostingsNotified += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error(
            `failed posting new listing to Slack postId=${listing.postId}: ${msg}`,
          );
        }
      }
      if (slackPostingsNotified > 0) {
        log.info(
          `Posted ${slackPostingsNotified} new listing(s) to Slack raw-postings`,
        );
      }
    } else {
      try {
        await postPosting({
          botToken: token,
          channelId: channel,
          message: formatNewPostingMessage({
            postId: `(batch ${report.postsNew})`,
            text: `Scrape batch postsNew=${report.postsNew} postsSeen=${report.postsSeen} (row load failed)`,
            url: input.groupUrl,
            groupId: input.groupId,
            groupUrl: input.groupUrl,
            env: settings.lane,
          }),
        });
        slackPostingsNotified = 1;
        log.info("Posted scrape batch summary to Slack raw-postings");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`failed posting scrape batch summary to Slack: ${msg}`);
      }
    }
  }

  return { ...report, slackNotified, slackPostingsNotified, newListings };
}

export type NotifyListingAgentFireAndForgetInput = NotifyListingAgentPayload & {
  /** When true, omit default outputSchema (Agent uses instructions only). */
  omitOutputSchema?: boolean;
};

export type NotifyListingAgentFireAndForgetDeps = NotifyListingAgentDeps & {
  settings?: Settings;
};

/**
 * Fire-and-forget activity: POST raw listing text to the CF Agent webhook and
 * return after HTTP accept (2xx). Does not wait for Agent extraction or Homie
 * ingest callback.
 *
 * Choice: one activity invocation per listing (workflow fans out after a
 * successful scrape with postsNew > 0). Short Temporal startToCloseTimeout
 * covers only the HTTP accept — Agent processing continues async.
 *
 * No-ops when HOMIE_CF_AGENT_WEBHOOK_URL is unset (local e2e safe).
 */
export async function notifyListingAgentFireAndForget(
  input: NotifyListingAgentFireAndForgetInput,
  deps: NotifyListingAgentFireAndForgetDeps = {},
): Promise<NotifyListingAgentResult> {
  const settings = deps.settings ?? loadSettings();
  const payload: NotifyListingAgentPayload = {
    text: input.text,
    instructions: input.instructions ?? DEFAULT_LISTING_EXTRACT_INSTRUCTIONS,
    postId: input.postId,
    groupId: input.groupId,
    url: input.url,
    ...(input.omitOutputSchema
      ? {}
      : {
          outputSchema: input.outputSchema ?? DEFAULT_LISTING_OUTPUT_SCHEMA,
        }),
  };

  const result = await notifyListingAgent(payload, {
    fetchFn: deps.fetchFn,
    config:
      deps.config ??
      ({
        webhookUrl: settings.cfAgentWebhookUrl,
        webhookSecret: settings.cfAgentWebhookSecret,
        authMode:
          (process.env.HOMIE_CF_AGENT_WEBHOOK_AUTH ?? "bearer").toLowerCase() ===
          "hmac"
            ? "hmac"
            : "bearer",
      } as const),
  });

  if (result.ok && result.skipped) {
    log.info(`notifyListingAgent skipped: ${result.reason}`);
  } else if (result.ok) {
    log.info(
      `notifyListingAgent accepted status=${result.status} group=${input.groupId ?? "-"} post=${input.postId ?? "-"}`,
    );
  } else {
    log.error(
      `notifyListingAgent rejected status=${result.status} detail=${result.detail}`,
    );
  }

  return result;
}
