import type { Settings } from "../../src/config.js";
import type { ScrapedPost } from "../../src/pipeline/types.js";

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://homie:homie@127.0.0.1:54329/homie";

export function fakeSettings(over: Partial<Settings> = {}): Settings {
  return {
    temporalAddress: "127.0.0.1:7233",
    temporalNamespace: "default",
    taskQueue: "homie-fb-scrape",
    facebookStatePath: "/tmp/homie-test-missing-state.json",
    slackBotToken: undefined,
    slackRuntimeErrorsChannelId: undefined,
    slackRawPostingsChannelId: undefined,
    lane: "local",
    cfAgentWebhookUrl: undefined,
    cfAgentWebhookSecret: undefined,
    ...over,
  };
}

/** Newest-first fake feed posts for a group. */
export function makePosts(
  n: number,
  groupId: string,
  startId = 1000,
): ScrapedPost[] {
  return Array.from({ length: n }, (_, i) => {
    const postId = String(startId + n - 1 - i);
    return {
      postId,
      url: `https://www.facebook.com/groups/${groupId}/posts/${postId}`,
      text: `listing ${postId} ₪${4000 + i}`,
    };
  });
}
