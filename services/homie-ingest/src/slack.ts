import type { ListingIngestBody, SlackNotifier, UpsertResult } from "./types.js";

export type SlackFetch = typeof fetch;

export type SlackNotifyConfig = {
  botToken: string;
  channelId: string;
  fetchImpl?: SlackFetch;
};

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
