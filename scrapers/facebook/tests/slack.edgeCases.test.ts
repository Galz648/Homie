import { describe, expect, test } from "vitest";
import {
  probeFacebookAuth,
  scrapeFacebookGroupFeed,
} from "../src/activities.js";
import { fakeSettings } from "./helpers/mockFixtures.js";
import type { RunReport } from "../src/pipeline/types.js";

describe("slack edge cases", () => {
  test("auth failure with Slack unset → slackNotified=false", async () => {
    const result = await probeFacebookAuth(
      {
        groupId: "g-slack-unset",
        groupUrl: "https://www.facebook.com/groups/g-slack-unset",
        workflowId: "wf-slack-unset",
      },
      {
        settings: fakeSettings(),
        probe: async (statePath) => ({
          status: "login_wall",
          detail: "Login wall at https://www.facebook.com/login",
          statePath,
        }),
      },
    );
    expect(result.status).toBe("login_wall");
    expect(result.slackNotified).toBe(false);
  });

  test("auth failure with mocked Slack → payload contract", async () => {
    const posts: Array<{
      botToken: string;
      channelId: string;
      message: { text: string; body: string };
    }> = [];

    const result = await probeFacebookAuth(
      {
        groupId: "35819517694",
        groupUrl: "https://www.facebook.com/groups/35819517694",
        workflowId: "fb-group-35819517694",
      },
      {
        settings: fakeSettings({
          slackBotToken: "xoxb-test",
          slackRuntimeErrorsChannelId: "C_RUNTIME",
        }),
        probe: async (statePath) => ({
          status: "login_wall",
          detail: "Login wall at https://www.facebook.com/login",
          statePath,
        }),
        postError: async (args) => {
          posts.push({
            botToken: args.botToken,
            channelId: args.channelId,
            message:
              typeof args.message === "string"
                ? { text: args.message, body: args.message }
                : { text: args.message.text, body: args.message.body },
          });
        },
      },
    );

    expect(result.slackNotified).toBe(true);
    expect(posts).toHaveLength(1);
    expect(posts[0]!.channelId).toBe("C_RUNTIME");
    expect(posts[0]!.message.body).toContain("facebook.auth");
    expect(posts[0]!.message.body).toContain("session_expired");
    expect(posts[0]!.message.body).toContain("import-chrome-session");
    expect(posts[0]!.message.body).toContain("signal-cookies-renewed");
    expect(posts[0]!.message.body).toContain("fb-group-35819517694");
    expect(posts[0]!.message.body).toMatch(
      /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (IDT|IST)/,
    );
  });

  test("checkpoint auth maps to throttle Slack code", async () => {
    const bodies: string[] = [];
    await probeFacebookAuth(
      {
        groupId: "g-checkpoint",
        groupUrl: "https://www.facebook.com/groups/g-checkpoint",
        workflowId: "wf-checkpoint",
      },
      {
        settings: fakeSettings({
          slackBotToken: "xoxb-test",
          slackRuntimeErrorsChannelId: "C_RUNTIME",
        }),
        probe: async (statePath) => ({
          status: "checkpoint",
          detail: "Facebook checkpoint at https://www.facebook.com/checkpoint/1",
          statePath,
        }),
        postError: async (args) => {
          const body =
            typeof args.message === "string"
              ? args.message
              : args.message.body;
          bodies.push(body);
        },
      },
    );
    expect(bodies[0]).toContain("`throttle`");
  });

  test("scrape crash with mocked Slack → dependency_failed payload", async () => {
    const bodies: string[] = [];
    const crashReport: RunReport = {
      groupId: "35819517694",
      status: "crash",
      stopReason: "ok",
      postsSeen: 0,
      postsNew: 0,
      postsUpserted: 0,
      coldStart: false,
      error: 'relation "scrape_cursors" does not exist',
    };

    const result = await scrapeFacebookGroupFeed(
      {
        groupId: "35819517694",
        groupUrl: "https://www.facebook.com/groups/35819517694",
        workflowId: "fb-group-35819517694",
      },
      {
        settings: fakeSettings({
          slackBotToken: "xoxb-test",
          slackRuntimeErrorsChannelId: "C_RUNTIME",
        }),
        run: async () => crashReport,
        postError: async (args) => {
          bodies.push(
            typeof args.message === "string"
              ? args.message
              : args.message.body,
          );
        },
      },
    );

    expect(result.status).toBe("crash");
    expect(result.slackNotified).toBe(true);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain("facebook.scrape");
    expect(bodies[0]).toContain("dependency_failed");
    expect(bodies[0]).toContain("scrape-db-migrate");
  });

  test("scrape crash with Slack unset → slackNotified=false", async () => {
    const result = await scrapeFacebookGroupFeed(
      {
        groupId: "g-crash",
        groupUrl: "https://www.facebook.com/groups/g-crash",
      },
      {
        settings: fakeSettings(),
        run: async () => ({
          groupId: "g-crash",
          status: "crash",
          stopReason: "ok",
          postsSeen: 0,
          postsNew: 0,
          postsUpserted: 0,
          coldStart: false,
          error: "boom",
        }),
      },
    );
    expect(result.slackNotified).toBe(false);
  });
});
