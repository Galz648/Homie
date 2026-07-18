import { describe, expect, test } from "bun:test";
import { resolveIngestListingsChannelId } from "../src/slack.js";

describe("resolveIngestListingsChannelId", () => {
  test("staging uses staging ingest channel only", () => {
    expect(
      resolveIngestListingsChannelId({
        HOMIE_LANE: "staging",
        SLACK_STAGING_INGEST_LISTINGS_CHANNEL_ID: "C_STAGING",
        SLACK_INGEST_LISTINGS_CHANNEL_ID: "C_PROD",
      }),
    ).toBe("C_STAGING");
  });

  test("staging never falls back to production channel", () => {
    expect(
      resolveIngestListingsChannelId({
        HOMIE_LANE: "staging",
        SLACK_INGEST_LISTINGS_CHANNEL_ID: "C_PROD",
      }),
    ).toBeUndefined();
  });

  test("production uses production ingest channel", () => {
    expect(
      resolveIngestListingsChannelId({
        HOMIE_LANE: "production",
        SLACK_STAGING_INGEST_LISTINGS_CHANNEL_ID: "C_STAGING",
        SLACK_INGEST_LISTINGS_CHANNEL_ID: "C_PROD",
      }),
    ).toBe("C_PROD");
  });

  test("HOMIE_INGEST_SLACK_CHANNEL_ID overrides lane default", () => {
    expect(
      resolveIngestListingsChannelId({
        HOMIE_LANE: "staging",
        HOMIE_INGEST_SLACK_CHANNEL_ID: "C_OVERRIDE",
        SLACK_STAGING_INGEST_LISTINGS_CHANNEL_ID: "C_STAGING",
      }),
    ).toBe("C_OVERRIDE");
  });
});
