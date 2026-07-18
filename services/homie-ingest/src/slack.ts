import type { ListingIngestBody, SlackNotifier, UpsertResult } from "./types.js";

export type SlackFetch = typeof fetch;

export type SlackNotifyConfig = {
  botToken: string;
  channelId: string;
  fetchImpl?: SlackFetch;
};

/**
 * Lane-aware #homie-listings-ingest channel.
 * Staging never falls back to the production channel.
 * Optional HOMIE_INGEST_SLACK_CHANNEL_ID overrides the lane default.
 */
export function resolveIngestListingsChannelId(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const explicit = env.HOMIE_INGEST_SLACK_CHANNEL_ID?.trim();
  if (explicit) return explicit;

  const lane = (env.HOMIE_LANE ?? env.HOMIE_ENV ?? "local").toLowerCase();
  if (lane === "staging") {
    return env.SLACK_STAGING_INGEST_LISTINGS_CHANNEL_ID?.trim() || undefined;
  }
  return env.SLACK_INGEST_LISTINGS_CHANNEL_ID?.trim() || undefined;
}

/** Best-effort Facebook post URL for a listing when a stored `postUrl` isn't available yet. */
function resolveListingPostUrl(
  listing: ListingIngestBody & UpsertResult,
): string {
  const withUrl = listing as { postUrl?: string };
  return withUrl.postUrl?.trim() || `https://www.facebook.com/${listing.postId}`;
}

/** Image CDN URLs for a listing, if the store has populated them. */
function resolveListingImages(
  listing: ListingIngestBody & UpsertResult,
): string[] {
  return (listing as { images?: string[] }).images ?? [];
}

/** One mrkdwn Slack message per ingested listing: post link + image links. */
export function formatIngestListingMessage(
  listing: ListingIngestBody & UpsertResult,
): { text: string; body: string } {
  const action = listing.created ? "created" : "updated";
  const postUrl = resolveListingPostUrl(listing);
  const images = resolveListingImages(listing);

  const text = `[Homie][ingest] apartment_listings ${action} postId=${listing.postId}`;
  const lines = [
    ":house: *Listing ingested*",
    `• postId: \`${listing.postId}\``,
    `• action: \`${action}\``,
    `• post: ${postUrl}`,
    images.length > 0
      ? `• images:\n${images.map((url) => `   • ${url}`).join("\n")}`
      : "• images: (no images)",
  ];

  return { text, body: lines.join("\n") };
}

export function createSlackNotifier(config: SlackNotifyConfig): SlackNotifier {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async notifyListingUpsert(
      listing: ListingIngestBody & UpsertResult,
    ): Promise<void> {
      const { text, body } = formatIngestListingMessage(listing);
      const resp = await fetchImpl("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.botToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          channel: config.channelId,
          text,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: body },
            },
          ],
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
