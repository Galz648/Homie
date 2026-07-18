import { afterEach, describe, expect, test } from "vitest";
import {
  resolveNewPostingsChannelId,
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

describe("resolveNewPostingsChannelId", () => {
  const keys = [
    "HOMIE_LANE",
    "HOMIE_ENV",
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

  test("local/prod uses SLACK_NEW_POSTINGS_CHANNEL_ID", () => {
    setEnv({
      HOMIE_LANE: "production",
      SLACK_NEW_POSTINGS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID: "C_STAGING",
    });
    expect(resolveNewPostingsChannelId()).toBe("C_PROD");
  });

  test("staging uses SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID only", () => {
    setEnv({
      HOMIE_LANE: "staging",
      SLACK_NEW_POSTINGS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID: "C_STAGING",
    });
    expect(resolveNewPostingsChannelId()).toBe("C_STAGING");
  });

  test("staging does not fall back to prod channel", () => {
    setEnv({
      HOMIE_ENV: "staging",
      SLACK_NEW_POSTINGS_CHANNEL_ID: "C_PROD",
      SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID: undefined,
    });
    expect(resolveNewPostingsChannelId()).toBeUndefined();
  });
});
