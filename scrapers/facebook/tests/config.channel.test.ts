import { afterEach, describe, expect, test } from "vitest";
import {
  resolveRawPostingsChannelId,
  resolveRuntimeErrorsChannelId,
} from "../src/config.js";

describe("resolveRuntimeErrorsChannelId", () => {
  const keys = [
    "HOMIE_LANE",
    "HOMIE_ENV",
    "SLACK_RUNTIME_ERRORS_CHANNEL_ID",
    "SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID",
  ] as const;
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
      delete saved[k];
    }
  });

  function setEnv(partial: Record<string, string | undefined>): void {
    for (const [k, v] of Object.entries(partial)) {
      if (!(k in saved)) saved[k] = process.env[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  test("local/prod uses SLACK_RUNTIME_ERRORS_CHANNEL_ID", () => {
    setEnv({
      HOMIE_LANE: "local",
      SLACK_RUNTIME_ERRORS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID: "C0BJ6AMH2LE",
    });
    expect(resolveRuntimeErrorsChannelId()).toBe("C_PROD");
  });

  test("staging uses SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID only", () => {
    setEnv({
      HOMIE_LANE: "staging",
      SLACK_RUNTIME_ERRORS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID: "C0BJ6AMH2LE",
    });
    expect(resolveRuntimeErrorsChannelId()).toBe("C0BJ6AMH2LE");
  });

  test("staging does not fall back to prod channel", () => {
    setEnv({
      HOMIE_ENV: "staging",
      SLACK_RUNTIME_ERRORS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID: undefined,
    });
    expect(resolveRuntimeErrorsChannelId()).toBeUndefined();
  });
});

describe("resolveRawPostingsChannelId", () => {
  const keys = [
    "HOMIE_LANE",
    "HOMIE_ENV",
    "SLACK_RAW_POSTINGS_CHANNEL_ID",
    "SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID",
    "SLACK_NEW_POSTINGS_CHANNEL_ID",
    "SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID",
  ] as const;
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
      delete saved[k];
    }
  });

  function setEnv(partial: Record<string, string | undefined>): void {
    for (const [k, v] of Object.entries(partial)) {
      if (!(k in saved)) saved[k] = process.env[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  test("local/prod uses SLACK_RAW_POSTINGS_CHANNEL_ID", () => {
    setEnv({
      HOMIE_LANE: "production",
      SLACK_RAW_POSTINGS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID: "C_STAGING",
    });
    expect(resolveRawPostingsChannelId()).toBe("C_PROD");
  });

  test("staging uses SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID only", () => {
    setEnv({
      HOMIE_LANE: "staging",
      SLACK_RAW_POSTINGS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID: "C_STAGING",
    });
    expect(resolveRawPostingsChannelId()).toBe("C_STAGING");
  });

  test("staging does not fall back to prod channel", () => {
    setEnv({
      HOMIE_ENV: "staging",
      SLACK_RAW_POSTINGS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID: undefined,
    });
    expect(resolveRawPostingsChannelId()).toBeUndefined();
  });

  test("falls back to old SLACK_NEW_POSTINGS_CHANNEL_ID during migration (prod)", () => {
    setEnv({
      HOMIE_LANE: "production",
      SLACK_RAW_POSTINGS_CHANNEL_ID: undefined,
      SLACK_NEW_POSTINGS_CHANNEL_ID: "C_OLD_PROD",
    });
    expect(resolveRawPostingsChannelId()).toBe("C_OLD_PROD");
  });

  test("falls back to old SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID during migration (staging)", () => {
    setEnv({
      HOMIE_LANE: "staging",
      SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID: undefined,
      SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID: "C_OLD_STAGING",
    });
    expect(resolveRawPostingsChannelId()).toBe("C_OLD_STAGING");
  });

  test("new name takes precedence over old fallback", () => {
    setEnv({
      HOMIE_LANE: "production",
      SLACK_RAW_POSTINGS_CHANNEL_ID: "C_NEW",
      SLACK_NEW_POSTINGS_CHANNEL_ID: "C_OLD_PROD",
    });
    expect(resolveRawPostingsChannelId()).toBe("C_NEW");
  });
});
