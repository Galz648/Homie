import { describe, expect, mock, test } from "bun:test";

import {
  authorizeWebhook,
  hmacHex,
  postHomieIngest,
  processListingWebhook,
  stubExtract,
} from "../src/listingExtractLogic.js";

const env = {
  HOMIE_CF_AGENT_WEBHOOK_SECRET: "test-webhook-secret",
  HOMIE_INGEST_URL: "http://ingest.test",
  HOMIE_INGEST_BEARER_TOKEN: "ingest-token",
};

describe("listingExtractLogic (mocked e2e)", () => {
  test("bearer authorize accepts matching Authorization", async () => {
    const ok = await authorizeWebhook(
      new Headers({ Authorization: "Bearer test-webhook-secret" }),
      "{}",
      env,
    );
    expect(ok).toBe(true);
  });

  test("bearer authorize rejects wrong secret", async () => {
    const ok = await authorizeWebhook(
      new Headers({ Authorization: "Bearer wrong" }),
      "{}",
      env,
    );
    expect(ok).toBe(false);
  });

  test("hmac authorize accepts matching X-Homie-Signature", async () => {
    const body = '{"text":"hi"}';
    const sig = await hmacHex("test-webhook-secret", body);
    const ok = await authorizeWebhook(
      new Headers({ "X-Homie-Signature": `sha256=${sig}` }),
      body,
      { ...env, HOMIE_CF_AGENT_WEBHOOK_AUTH: "hmac" },
    );
    expect(ok).toBe(true);
  });

  test("stubExtract uses postId from body", () => {
    expect(
      stubExtract(
        {
          text: "listing",
          instructions: "extract",
          postId: "post-abc",
        },
        "ignored",
      ),
    ).toEqual({
      postId: "post-abc",
      price: null,
      entryDate: null,
      contactPhone: null,
      address: null,
      conditionals: null,
    });
  });

  test("processListingWebhook: unauthorized → 401, no listing", async () => {
    const result = await processListingWebhook({
      method: "POST",
      headers: new Headers({ Authorization: "Bearer wrong" }),
      bodyText: JSON.stringify({
        text: "x",
        instructions: "y",
        postId: "p1",
      }),
      env,
      instanceId: "p1",
    });
    expect(result.status).toBe(401);
    expect(result.listing).toBeNull();
  });

  test("processListingWebhook: happy path → 202 + listing for waitUntil", async () => {
    const result = await processListingWebhook({
      method: "POST",
      headers: new Headers({ Authorization: "Bearer test-webhook-secret" }),
      bodyText: JSON.stringify({
        text: "Nice apartment in Tel Aviv",
        instructions: "Extract fields",
        postId: "fb-post-99",
        groupId: "g1",
        url: "https://facebook.com/posts/99",
      }),
      env,
      instanceId: "fb-post-99",
    });
    expect(result.status).toBe(202);
    expect(result.listing?.postId).toBe("fb-post-99");
  });

  test("postHomieIngest POSTs Bearer to /ingest/listings", async () => {
    const fetchImpl = mock(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const res = await postHomieIngest(
      env,
      { postId: "p1", price: null },
      fetchImpl as unknown as typeof fetch,
    );
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("http://ingest.test/ingest/listings");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ingest-token");
  });

  test("full mocked chain: webhook accept → ingest fetch", async () => {
    const fetchImpl = mock(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const webhook = await processListingWebhook({
      method: "POST",
      headers: new Headers({ Authorization: "Bearer test-webhook-secret" }),
      bodyText: JSON.stringify({
        text: "3 rooms",
        instructions: "extract",
        postId: "chain-1",
      }),
      env,
      instanceId: "chain-1",
    });
    expect(webhook.listing).not.toBeNull();
    await postHomieIngest(
      env,
      webhook.listing!,
      fetchImpl as unknown as typeof fetch,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("http://ingest.test/ingest/listings");
    expect((init as RequestInit).method).toBe("POST");
  });
});
