/**
 * Pure helpers for ListingExtractAgent — unit-testable without wrangler.
 */
export type AgentRequestBody = {
  text: string;
  instructions: string;
  outputSchema?: Record<string, unknown>;
  postId?: string;
  groupId?: string;
  url?: string;
};

export type HomieIngestBody = {
  postId: string;
  price?: number | null;
  currency?: string | null;
  entryDate?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  conditionals?: string | null;
};

export type WebhookAuthEnv = {
  HOMIE_CF_AGENT_WEBHOOK_SECRET: string;
  HOMIE_CF_AGENT_WEBHOOK_AUTH?: string;
};

export async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function authorizeWebhook(
  headers: Headers,
  bodyText: string,
  env: WebhookAuthEnv,
): Promise<boolean> {
  const secret = env.HOMIE_CF_AGENT_WEBHOOK_SECRET;
  if (!secret) return false;

  const mode = (env.HOMIE_CF_AGENT_WEBHOOK_AUTH ?? "bearer").toLowerCase();
  if (mode === "hmac") {
    const header = headers.get("X-Homie-Signature") ?? "";
    const expected = `sha256=${await hmacHex(secret, bodyText)}`;
    return header === expected;
  }

  const auth = headers.get("Authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** Stub extraction until LLM / Think harness is wired. */
export function stubExtract(
  req: AgentRequestBody,
  instanceId: string,
): HomieIngestBody | null {
  const postId = (req.postId ?? instanceId).trim();
  if (!postId || postId === "unknown") return null;
  return {
    postId,
    price: null,
    entryDate: null,
    contactPhone: null,
    address: null,
    conditionals: null,
  };
}

export async function postHomieIngest(
  env: { HOMIE_INGEST_URL: string; HOMIE_INGEST_BEARER_TOKEN: string },
  listing: HomieIngestBody,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const base = (env.HOMIE_INGEST_URL ?? "").replace(/\/$/, "");
  if (!base) {
    throw new Error("HOMIE_INGEST_URL is not set");
  }
  return fetchImpl(`${base}/ingest/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.HOMIE_INGEST_BEARER_TOKEN}`,
    },
    body: JSON.stringify(listing),
  });
}

/**
 * Shared webhook processing used by Agent.onRequest (and unit tests).
 * Returns the HTTP response parts; caller schedules ingest via waitUntil.
 */
export async function processListingWebhook(args: {
  method: string;
  headers: Headers;
  bodyText: string;
  env: WebhookAuthEnv & {
    HOMIE_INGEST_URL: string;
    HOMIE_INGEST_BEARER_TOKEN: string;
  };
  instanceId: string;
}): Promise<
  | { status: number; body: unknown; listing: null }
  | { status: number; body: unknown; listing: HomieIngestBody }
> {
  if (args.method === "GET") {
    return {
      status: 200,
      body: { ok: true, agent: "ListingExtractAgent" },
      listing: null,
    };
  }
  if (args.method !== "POST") {
    return { status: 405, body: { error: "method not allowed" }, listing: null };
  }

  if (!(await authorizeWebhook(args.headers, args.bodyText, args.env))) {
    return { status: 401, body: { error: "unauthorized" }, listing: null };
  }

  let parsed: AgentRequestBody;
  try {
    parsed = JSON.parse(args.bodyText) as AgentRequestBody;
  } catch {
    return { status: 400, body: { error: "invalid JSON body" }, listing: null };
  }

  if (typeof parsed.text !== "string" || !parsed.text.trim()) {
    return { status: 400, body: { error: "text is required" }, listing: null };
  }
  if (typeof parsed.instructions !== "string" || !parsed.instructions.trim()) {
    return {
      status: 400,
      body: { error: "instructions is required" },
      listing: null,
    };
  }

  const bodyPostId =
    typeof parsed.postId === "string" ? parsed.postId.trim() : "";
  const instanceId = bodyPostId || args.instanceId || "unknown";
  const listing = stubExtract(parsed, instanceId);

  return {
    status: 202,
    body: { ok: true, accepted: true, agent: instanceId },
    listing,
  };
}
