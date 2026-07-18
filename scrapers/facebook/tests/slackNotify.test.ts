import { describe, expect, test } from "vitest";
import {
  formatAuthFailureMessage,
  formatRuntimeErrorMessage,
  formatScrapeFailureMessage,
  shouldAlertScrape,
} from "../src/slackNotify.js";
import type { RunReport } from "../src/pipeline/types.js";

describe("formatRuntimeErrorMessage", () => {
  test("builds fallback text + body with required sections", () => {
    const msg = formatRuntimeErrorMessage({
      component: "facebook.auth",
      code: "session_expired",
      summary: "Facebook session invalid / login wall (auth probe failed).",
      service: "facebook-scraper",
      env: "local",
      occurredAt: new Date("2026-07-18T13:04:00.000Z"),
      groupId: "35819517694",
      workflowId: "fb-group-35819517694",
      activity: "probeFacebookAuth",
      evidence: ["status: `login_wall`", "detail: Login wall at https://…"],
      nextSteps: ["renew session", "signal cookies_renewed"],
    });

    expect(msg.text).toContain("[Homie][error]");
    expect(msg.text).toContain("[facebook.auth]");
    expect(msg.text).toContain("group=35819517694");
    expect(msg.text).toContain("wf=fb-group-35819517694");

    expect(msg.body).toContain("*Homie runtime error*");
    expect(msg.body).toContain("`facebook.auth`");
    expect(msg.body).toContain("`session_expired`");
    expect(msg.body).toContain("*What*");
    expect(msg.body).toContain("*Where*");
    expect(msg.body).toContain("*Evidence*");
    expect(msg.body).toContain("*Next*");
    expect(msg.body).toContain("1. renew session");
    expect(msg.body).toContain("probeFacebookAuth");
    expect(msg.body).toContain("2026-07-18 16:04:00 IDT");
    expect(msg.blocks).toHaveLength(1);
    expect(msg.blocks[0]?.type).toBe("section");
  });
});

describe("formatAuthFailureMessage", () => {
  test("maps login_wall to session_expired template", () => {
    const msg = formatAuthFailureMessage({
      groupId: "g1",
      groupUrl: "https://facebook.com/groups/g1",
      env: "staging",
      workflowId: "fb-group-g1",
      result: {
        status: "login_wall",
        detail: "Login wall at https://www.facebook.com/login",
        statePath: "/tmp/facebook_state.json",
      },
    });

    expect(msg.body).toContain("`session_expired`");
    expect(msg.body).toContain("*staging*");
    expect(msg.body).toContain("`login_wall`");
    expect(msg.body).toContain("signal-cookies-renewed");
    expect(msg.body).toContain("fb-group-g1");
  });

  test("maps checkpoint to throttle", () => {
    const msg = formatAuthFailureMessage({
      groupId: "g1",
      groupUrl: "https://facebook.com/groups/g1",
      result: {
        status: "checkpoint",
        detail: "Facebook checkpoint",
        statePath: "/tmp/state.json",
      },
    });
    expect(msg.body).toContain("`throttle`");
  });
});

describe("formatScrapeFailureMessage", () => {
  const baseReport = (over: Partial<RunReport>): RunReport => ({
    groupId: "35819517694",
    status: "crash",
    stopReason: "ok",
    postsSeen: 0,
    postsNew: 0,
    postsUpserted: 0,
    coldStart: false,
    ...over,
  });

  test("missing relation crash → dependency_failed + migrate next steps", () => {
    const msg = formatScrapeFailureMessage({
      report: baseReport({
        error: 'relation "scrape_cursors" does not exist',
      }),
      groupUrl: "https://www.facebook.com/groups/35819517694",
      workflowId: "fb-group-35819517694",
      env: "staging",
    });
    expect(msg.body).toContain("`facebook.scrape`");
    expect(msg.body).toContain("`dependency_failed`");
    expect(msg.body).toContain("scrape-db-migrate");
    expect(msg.body).toContain("scrape_cursors");
    expect(shouldAlertScrape("crash")).toBe(true);
    expect(shouldAlertScrape("ok")).toBe(false);
  });

  test("empty_suspect → zero_results", () => {
    const msg = formatScrapeFailureMessage({
      report: baseReport({
        status: "empty_suspect",
        stopReason: "empty_suspect",
      }),
      groupUrl: "https://facebook.com/groups/g1",
    });
    expect(msg.body).toContain("`zero_results`");
  });
});
