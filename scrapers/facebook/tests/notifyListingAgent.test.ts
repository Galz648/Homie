import { createHmac } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  DEFAULT_LISTING_EXTRACT_INSTRUCTIONS,
  DEFAULT_LISTING_OUTPUT_SCHEMA,
  notifyListingAgent,
} from "../src/notifyListingAgent.js";

describe("notifyListingAgent", () => {
  afterEach(() => {
    delete process.env.HOMIE_CF_AGENT_WEBHOOK_URL;
    delete process.env.HOMIE_CF_AGENT_WEBHOOK_SECRET;
    delete process.env.HOMIE_CF_AGENT_WEBHOOK_AUTH;
  });

  test("no-ops when webhook URL unset (local e2e safe)", async () => {
    const fetchFn = vi.fn();
    const result = await notifyListingAgent(
      { text: "דירה בתל אביב ₪7500" },
      { fetchFn: fetchFn as unknown as typeof fetch },
    );
    expect(result).toEqual({
      ok: true,
      skipped: true,
      reason: "HOMIE_CF_AGENT_WEBHOOK_URL unset",
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test("POSTs JSON and resolves on 2xx without waiting on Agent processing", async () => {
    let resolveBody: (v: string) => void = () => {};
    const bodyConsumed = new Promise<string>((r) => {
      resolveBody = r;
    });

    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      resolveBody(body);
      // Return immediately — simulates Agent accepting the job; extraction
      // would continue async on the Agent side (we do not poll Homie).
      return new Response("accepted", { status: 202 });
    });

    const started = Date.now();
    const result = await notifyListingAgent(
      {
        text: "roommate near Dizengoff, entry Aug 1, 054-1234567",
        postId: "p1",
        groupId: "g1",
        url: "https://facebook.com/groups/g1/posts/p1",
      },
      {
        fetchFn: fetchFn as unknown as typeof fetch,
        config: {
          webhookUrl: "https://agent.example",
          webhookSecret: "test-secret",
          authMode: "bearer",
        },
      },
    );
    const elapsed = Date.now() - started;

    expect(result).toEqual({ ok: true, skipped: false, status: 202 });
    expect(elapsed).toBeLessThan(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://agent.example/webhooks/p1");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer test-secret");

    const body = await bodyConsumed;
    const parsed = JSON.parse(body) as Record<string, unknown>;
    expect(parsed.text).toBe(
      "roommate near Dizengoff, entry Aug 1, 054-1234567",
    );
    expect(parsed.instructions).toBe(DEFAULT_LISTING_EXTRACT_INSTRUCTIONS);
    expect(parsed.outputSchema).toEqual(DEFAULT_LISTING_OUTPUT_SCHEMA);
    expect(parsed.postId).toBe("p1");
    expect(parsed.groupId).toBe("g1");
  });

  test("HMAC auth signs body when authMode=hmac", async () => {
    const secret = "hmac-secret";
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Response("ok", { status: 200 });
    });

    await notifyListingAgent(
      { text: "listing text", instructions: "extract" },
      {
        fetchFn: fetchFn as unknown as typeof fetch,
        config: {
          webhookUrl: "https://agent.example",
          webhookSecret: secret,
          authMode: "hmac",
        },
      },
    );

    const init = fetchFn.mock.calls[0]![1] as RequestInit;
    const body = String(init.body);
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Homie-Signature"]).toBe(`sha256=${expected}`);
    expect(headers.Authorization).toBeUndefined();
  });

  test("returns ok:false on non-2xx without throwing", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 503 }));
    const result = await notifyListingAgent(
      { text: "x" },
      {
        fetchFn: fetchFn as unknown as typeof fetch,
        config: {
          webhookUrl: "https://agent.example/hook",
          webhookSecret: undefined,
          authMode: "bearer",
        },
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
    }
  });
});
