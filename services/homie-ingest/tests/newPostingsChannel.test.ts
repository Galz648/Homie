import { describe, expect, test } from "bun:test";
import { resolveNewPostingsChannelId } from "../src/slack.js";

describe("resolveNewPostingsChannelId", () => {
  test("staging uses staging channel only", () => {
    expect(
      resolveNewPostingsChannelId({
        HOMIE_LANE: "staging",
        SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID: "C_STAGING",
        SLACK_NEW_POSTINGS_CHANNEL_ID: "C_PROD",
      }),
    ).toBe("C_STAGING");
  });

  test("staging never falls back to production channel", () => {
    expect(
      resolveNewPostingsChannelId({
        HOMIE_LANE: "staging",
        SLACK_NEW_POSTINGS_CHANNEL_ID: "C_PROD",
      }),
    ).toBeUndefined();
  });

  test("production uses production channel", () => {
    expect(
      resolveNewPostingsChannelId({
        HOMIE_LANE: "production",
        SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID: "C_STAGING",
        SLACK_NEW_POSTINGS_CHANNEL_ID: "C_PROD",
      }),
    ).toBe("C_PROD");
  });

  test("HOMIE_INGEST_SLACK_CHANNEL_ID overrides lane default", () => {
    expect(
      resolveNewPostingsChannelId({
        HOMIE_LANE: "staging",
        HOMIE_INGEST_SLACK_CHANNEL_ID: "C_OVERRIDE",
        SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID: "C_STAGING",
      }),
    ).toBe("C_OVERRIDE");
  });
});
