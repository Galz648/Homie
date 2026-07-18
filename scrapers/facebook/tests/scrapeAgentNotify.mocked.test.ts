/**
 * Mocked scrape → Agent notify fan-out (no live Facebook / CF / Temporal).
 *
 * Mirrors facebookGroupScrapeWorkflow after postsNew > 0: activity returns
 * newListings, then notifyListingAgentFireAndForget per row with mocked fetch.
 */
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import postgres from "postgres";

import {
  notifyListingAgentFireAndForget,
  scrapeFacebookGroupFeed,
} from "../src/activities.js";
import { runScrapePipeline } from "../src/pipeline/runScrape.js";
import { fakeSettings, TEST_DATABASE_URL } from "./helpers/mockFixtures.js";

const GROUP_ID = "mock-agent-notify-group";
const GROUP_URL = `https://www.facebook.com/groups/${GROUP_ID}`;

describe("scrape → Agent notify (mocked e2e)", () => {
  const sql = postgres(TEST_DATABASE_URL, { max: 2 });

  beforeAll(async () => {
    await sql`DELETE FROM scrape_cursors WHERE "groupId" = ${GROUP_ID}`;
    await sql`DELETE FROM raw_facebook_posts WHERE "groupId" = ${GROUP_ID}`;
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  test("pipeline newListings fan out to Agent webhook URLs", async () => {
    const postA = `mock-agent-a-${Date.now()}`;
    const postB = `mock-agent-b-${Date.now()}`;

    const postCalls: unknown[] = [];
    const report = await scrapeFacebookGroupFeed(
      {
        groupId: GROUP_ID,
        groupUrl: GROUP_URL,
        workflowId: "e2e-mock-agent-notify",
      },
      {
        settings: fakeSettings({
          slackBotToken: "xoxb-test",
          slackNewPostingsChannelId: "C_STAGING_POSTINGS",
          lane: "staging",
        }),
        postPosting: async (args) => {
          postCalls.push(args);
        },
        run: (args) =>
          runScrapePipeline({
            ...args,
            databaseUrl: TEST_DATABASE_URL,
            scrapeFn: async () => ({
              posts: [
                {
                  postId: postA,
                  url: `${GROUP_URL}/posts/${postA}/`,
                  text: `Mock listing ${postA} — 3 rooms, parking`,
                },
                {
                  postId: postB,
                  url: `${GROUP_URL}/posts/${postB}/`,
                  text: `Mock listing ${postB} — balcony, pets ok`,
                },
              ],
              stopReason: "cold_start_cap",
            }),
          }),
      },
    );

    expect(report.status).toBe("ok");
    expect(report.postsNew).toBe(2);
    expect(report.newListings).toHaveLength(2);
    expect(report.slackPostingsNotified).toBe(2);
    expect(postCalls).toHaveLength(2);
    expect(
      (postCalls[0] as { channelId: string }).channelId,
    ).toBe("C_STAGING_POSTINGS");

    const fetchFn = vi.fn(
      async () => new Response("accepted", { status: 202 }),
    );

    const results = await Promise.all(
      report.newListings.map((listing) =>
        notifyListingAgentFireAndForget(
          {
            text: listing.text,
            postId: listing.postId,
            groupId: GROUP_ID,
            url: listing.url,
          },
          {
            fetchFn: fetchFn as unknown as typeof fetch,
            config: {
              webhookUrl: "https://listing-extract.example",
              webhookSecret: "mock-secret",
              authMode: "bearer",
            },
          },
        ),
      ),
    );

    expect(results.every((r) => r.ok && !r.skipped)).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const urls = fetchFn.mock.calls.map((c) => c[0] as string).sort();
    expect(urls).toEqual(
      [
        `https://listing-extract.example/webhooks/${postA}`,
        `https://listing-extract.example/webhooks/${postB}`,
      ].sort(),
    );

    for (const call of fetchFn.mock.calls) {
      const init = call[1] as RequestInit;
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: "Bearer mock-secret",
        "Content-Type": "application/json",
      });
      const body = JSON.parse(String(init.body)) as {
        text: string;
        instructions: string;
        postId: string;
      };
      expect(body.text.length).toBeGreaterThan(0);
      expect(body.instructions.length).toBeGreaterThan(0);
      expect(body.postId).toMatch(/^mock-agent-/);
    }
  });

  test("notify skips when webhook URL unset (local default)", async () => {
    const r = await notifyListingAgentFireAndForget(
      {
        text: "x",
        postId: "p",
        groupId: GROUP_ID,
        url: "https://example.com",
      },
      {
        config: {
          webhookUrl: undefined,
          webhookSecret: undefined,
          authMode: "bearer",
        },
      },
    );
    expect(r.skipped).toBe(true);
    expect(r.ok).toBe(true);
  });
});
