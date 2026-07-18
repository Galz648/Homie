/**
 * Minimal Cloudflare Worker / Agent stub for listing extraction.
 *
 * - Verifies Temporal → Agent webhook secret (Bearer or HMAC)
 * - Accepts immediately (fire-and-forget from Temporal's POV)
 * - POSTs structured body to Homie ingest with Bearer token
 *
 * No DATABASE_URL / Hyperdrive — Agent never talks to Postgres.
 */

export type Env = {
  /** Shared secret from Temporal worker (`HOMIE_CF_AGENT_WEBHOOK_SECRET`). */
  HOMIE_CF_AGENT_WEBHOOK_SECRET: string;
  /** Bearer token for Homie ingest (`HOMIE_INGEST_BEARER_TOKEN`). */
  HOMIE_INGEST_BEARER_TOKEN: string;
  /** Homie ingest base URL, e.g. https://ingest.example */
  HOMIE_INGEST_URL: string;
  /** `bearer` (default) or `hmac` — must match Temporal auth mode. */
  HOMIE_CF_AGENT_WEBHOOK_AUTH?: string;
};

type AgentRequest = {
  text: string;
  instructions: string;
  outputSchema?: Record<string, unknown>;
  postId?: string;
  groupId?: string;
  url?: string;
};

type HomieIngestBody = {
  postId: string;
  price?: number | null;
  currency?: string | null;
  entryDate?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  conditionals?: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function hmacHex(secret: string, body: string): Promise<string> {
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

async function authorizeWebhook(
  req: Request,
  bodyText: string,
  env: Env,
): Promise<boolean> {
  const secret = env.HOMIE_CF_AGENT_WEBHOOK_SECRET;
  if (!secret) return false;

  const mode = (env.HOMIE_CF_AGENT_WEBHOOK_AUTH ?? "bearer").toLowerCase();
  if (mode === "hmac") {
    const header = req.headers.get("X-Homie-Signature") ?? "";
    const expected = `sha256=${await hmacHex(secret, bodyText)}`;
    return header === expected;
  }

  const auth = req.headers.get("Authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * Stub extraction: when postId is present, emit a minimal Homie body.
 * Real LLM extraction would use `text` + `instructions` + `outputSchema`.
 */
function stubExtract(req: AgentRequest): HomieIngestBody | null {
  if (!req.postId || req.postId.trim() === "") return null;
  return {
    postId: req.postId.trim(),
    price: null,
    entryDate: null,
    contactPhone: null,
    address: null,
    conditionals: null,
  };
}

async function postHomieIngest(
  env: Env,
  listing: HomieIngestBody,
): Promise<Response> {
  const base = env.HOMIE_INGEST_URL.replace(/\/$/, "");
  return fetch(`${base}/ingest/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.HOMIE_INGEST_BEARER_TOKEN}`,
    },
    body: JSON.stringify(listing),
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/healthz") {
      return json(200, { ok: true });
    }

    if (req.method === "POST" && (url.pathname === "/" || url.pathname === "/webhook")) {
      const bodyText = await req.text();
      if (!(await authorizeWebhook(req, bodyText, env))) {
        return json(401, { error: "unauthorized" });
      }

      let parsed: AgentRequest;
      try {
        parsed = JSON.parse(bodyText) as AgentRequest;
      } catch {
        return json(400, { error: "invalid JSON body" });
      }

      if (typeof parsed.text !== "string" || !parsed.text.trim()) {
        return json(400, { error: "text is required" });
      }
      if (typeof parsed.instructions !== "string" || !parsed.instructions.trim()) {
        return json(400, { error: "instructions is required" });
      }

      // Accept immediately so Temporal can return (fire-and-forget).
      // Extraction + Homie callback continue without blocking the scrape activity.
      const listing = stubExtract(parsed);
      if (listing) {
        // Best-effort callback; stub does not await LLM — just forward shape.
        const ingestResp = await postHomieIngest(env, listing);
        if (!ingestResp.ok) {
          const detail = await ingestResp.text().catch(() => "");
          console.error(
            "[listing-extract] Homie ingest failed:",
            ingestResp.status,
            detail.slice(0, 200),
          );
        }
      }

      return json(202, { ok: true, accepted: true });
    }

    return json(404, { error: "not found" });
  },
};
