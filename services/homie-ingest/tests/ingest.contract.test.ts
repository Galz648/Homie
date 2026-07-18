import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createIngestHandler,
  createMemoryStore,
  createNoopRuntimeErrorAlerter,
  createSlackNotifier,
  startServer,
} from "../src/server.js";
import type { RuntimeErrorAlerter } from "../src/types.js";

const BEARER = "test-ingest-token";

describe("homie-ingest contract", () => {
  const store = createMemoryStore();
  const slackCalls: Array<{ url: string; body: unknown }> = [];

  const slackFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    slackCalls.push({ url, body });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const slack = createSlackNotifier({
    botToken: "xoxb-test",
    channelId: "C_TEST",
    fetchImpl: slackFetch,
  });

  let baseUrl = "";
  let stop: (() => void) | undefined;

  beforeAll(async () => {
    const server = await startServer({
      bearerToken: BEARER,
      store,
      slack,
      runtimeErrors: createNoopRuntimeErrorAlerter(),
      env: "test",
      port: 0,
      hostname: "127.0.0.1",
    });
    baseUrl = server.url;
    stop = server.stop;
  });

  afterAll(() => {
    stop?.();
  });

  test("GET /healthz → 200", async () => {
    const resp = await fetch(`${baseUrl}/healthz`);
    expect(resp.status).toBe(200);
    const json = (await resp.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  test("POST /ingest/listings without bearer → 401", async () => {
    const resp = await fetch(`${baseUrl}/ingest/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: "p1" }),
    });
    expect(resp.status).toBe(401);
  });

  test("POST /ingest/listings with wrong bearer → 401", async () => {
    const resp = await fetch(`${baseUrl}/ingest/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong-token",
      },
      body: JSON.stringify({ postId: "p1" }),
    });
    expect(resp.status).toBe(401);
  });

  test("valid bearer upserts listing and invokes Slack", async () => {
    slackCalls.length = 0;
    const payload = {
      postId: "fb-post-42",
      price: 7500,
      currency: "ILS",
      contactPhone: "050-0000000",
      address: "Tel Aviv",
      conditionals: "no pets",
    };

    const resp = await fetch(`${baseUrl}/ingest/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BEARER}`,
      },
      body: JSON.stringify(payload),
    });

    expect(resp.status).toBe(200);
    const json = (await resp.json()) as {
      ok: boolean;
      postId: string;
      created: boolean;
    };
    expect(json.ok).toBe(true);
    expect(json.postId).toBe("fb-post-42");
    expect(json.created).toBe(true);
    expect(store.rows.get("fb-post-42")?.price).toBe(7500);

    expect(slackCalls.length).toBe(1);
    expect(slackCalls[0]?.url).toBe("https://slack.com/api/chat.postMessage");
    expect((slackCalls[0]?.body as { channel: string }).channel).toBe("C_TEST");
    expect(
      String((slackCalls[0]?.body as { text: string }).text),
    ).toContain("fb-post-42");
  });

  test("idempotent upsert by postId updates and notifies again", async () => {
    slackCalls.length = 0;
    const resp = await fetch(`${baseUrl}/ingest/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BEARER}`,
      },
      body: JSON.stringify({ postId: "fb-post-42", price: 8000 }),
    });
    expect(resp.status).toBe(200);
    const json = (await resp.json()) as { created: boolean };
    expect(json.created).toBe(false);
    expect(store.rows.get("fb-post-42")?.price).toBe(8000);
    expect(slackCalls.length).toBe(1);
  });
});

describe("Slack notify failure after upsert", () => {
  test("returns 200, keeps row, logs + runtime-errors alert", async () => {
    const store = createMemoryStore();
    const alerts: Array<{
      component: string;
      code: string;
      summary: string;
      evidence?: string[];
    }> = [];
    const runtimeErrors: RuntimeErrorAlerter = {
      async alert(input) {
        alerts.push(input);
      },
    };
    const logged: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    };

    try {
      const handler = createIngestHandler({
        bearerToken: BEARER,
        store,
        slack: {
          async notifyListingUpsert() {
            throw new Error("Slack chat.postMessage failed: channel_not_found");
          },
        },
        runtimeErrors,
        env: "staging",
      });

      const resp = await handler(
        new Request("http://local/ingest/listings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${BEARER}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postId: "fb-slack-fail", price: 1000 }),
        }),
      );

      expect(resp.status).toBe(200);
      const json = (await resp.json()) as { ok: boolean; postId: string };
      expect(json.ok).toBe(true);
      expect(json.postId).toBe("fb-slack-fail");
      expect(store.rows.get("fb-slack-fail")?.price).toBe(1000);

      expect(alerts.length).toBe(1);
      expect(alerts[0]?.component).toBe("ingest.slack");
      expect(alerts[0]?.code).toBe("dependency_failed");

      const structured = logged
        .map((line) => {
          try {
            return JSON.parse(line) as { component?: string; code?: string };
          } catch {
            return null;
          }
        })
        .find((e) => e?.component === "ingest.slack");
      expect(structured?.code).toBe("dependency_failed");
    } finally {
      console.error = origError;
    }
  });
});

describe("createIngestHandler unit", () => {
  test("handler rejects missing postId with 400", async () => {
    const handler = createIngestHandler({
      bearerToken: BEARER,
      store: createMemoryStore(),
      slack: { async notifyListingUpsert() {} },
      runtimeErrors: createNoopRuntimeErrorAlerter(),
    });
    const resp = await handler(
      new Request("http://local/ingest/listings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BEARER}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price: 1 }),
      }),
    );
    expect(resp.status).toBe(400);
  });
});
