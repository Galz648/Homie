import type { ListingIngestBody, SlackNotifier, UpsertResult } from "./types.js";

export type SlackFetch = typeof fetch;

export type SlackNotifyConfig = {
  botToken: string;
  channelId: string;
  fetchImpl?: SlackFetch;
};

/**
 * Lane-aware #homie-new-postings channel.
 * Staging never falls back to the production channel.
 * Optional HOMIE_INGEST_SLACK_CHANNEL_ID overrides the lane default.
 */
export function resolveNewPostingsChannelId(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const explicit = env.HOMIE_INGEST_SLACK_CHANNEL_ID?.trim();
  if (explicit) return explicit;

  const lane = (env.HOMIE_LANE ?? env.HOMIE_ENV ?? "local").toLowerCase();
  if (lane === "staging") {
    return env.SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID?.trim() || undefined;
  }
  return env.SLACK_NEW_POSTINGS_CHANNEL_ID?.trim() || undefined;
}

export function createSlackNotifier(config: SlackNotifyConfig): SlackNotifier {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async notifyListingUpsert(
      listing: ListingIngestBody & UpsertResult,
    ): Promise<void> {
      const action = listing.created ? "created" : "updated";
      const text = `[Homie][ingest] apartment_listings ${action} postId=${listing.postId}`;
      const resp = await fetchImpl("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.botToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          channel: config.channelId,
          text,
          mrkdwn: true,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Slack HTTP ${resp.status}`);
      }

      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        throw new Error(`Slack chat.postMessage failed: ${data.error}`);
      }
    },
  };
}

/** No-op notifier when Slack env is unset (local/dev). */
export function createNoopSlackNotifier(): SlackNotifier {
  return {
    async notifyListingUpsert(): Promise<void> {
      /* intentional no-op */
    },
  };
}
