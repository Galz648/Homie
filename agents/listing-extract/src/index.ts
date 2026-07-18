/**
 * Cloudflare Agent (Agents SDK) for listing extraction.
 *
 * Temporal → POST /webhooks/:postId → ListingExtractAgent.onRequest
 * Agent verifies webhook secret, extracts (stub → later LLM), POSTs Homie ingest.
 * No DATABASE_URL / Hyperdrive — Agent never talks to Postgres.
 */
import { Agent, getAgentByName, routeAgentRequest } from "agents";

export type Env = {
  ListingExtractAgent: DurableObjectNamespace<ListingExtractAgent>;
  HOMIE_CF_AGENT_WEBHOOK_SECRET: string;
  HOMIE_INGEST_BEARER_TOKEN: string;
  HOMIE_INGEST_URL: string;
  HOMIE_CF_AGENT_WEBHOOK_AUTH?: string;
};

type AgentRequestBody = {
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

/** Stub extraction until LLM / Think harness is wired. */
function stubExtract(req: AgentRequestBody, instanceId: string): HomieIngestBody | null {
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

async function postHomieIngest(
  env: Env,
  listing: HomieIngestBody,
): Promise<Response> {
  const base = (env.HOMIE_INGEST_URL ?? "").replace(/\/$/, "");
  if (!base) {
    throw new Error("HOMIE_INGEST_URL is not set");
  }
  return fetch(`${base}/ingest/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.HOMIE_INGEST_BEARER_TOKEN}`,
    },
    body: JSON.stringify(listing),
  });
}

/**
 * One Durable Object Agent instance per Facebook postId (webhook entity).
 */
export class ListingExtractAgent extends Agent<Env> {
  async onRequest(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return json(200, { ok: true, agent: "ListingExtractAgent" });
    }
    if (request.method !== "POST") {
      return json(405, { error: "method not allowed" });
    }

    const bodyText = await request.text();
    if (!(await authorizeWebhook(request, bodyText, this.env))) {
      return json(401, { error: "unauthorized" });
    }

    let parsed: AgentRequestBody;
    try {
      parsed = JSON.parse(bodyText) as AgentRequestBody;
    } catch {
      return json(400, { error: "invalid JSON body" });
    }

    if (typeof parsed.text !== "string" || !parsed.text.trim()) {
      return json(400, { error: "text is required" });
    }
    if (typeof parsed.instructions !== "string" || !parsed.instructions.trim()) {
      return json(400, { error: "instructions is required" });
    }

    // Prefer body.postId; fall back to Agent instance name (DO id from /webhooks/:postId).
    const bodyPostId =
      typeof parsed.postId === "string" ? parsed.postId.trim() : "";
    const instanceId = bodyPostId || this.name || "unknown";
    const listing = stubExtract(parsed, instanceId);

    // Accept for Temporal FF; continue ingest off the request path when possible.
    if (listing) {
      this.ctx.waitUntil(
        (async () => {
          try {
            const ingestResp = await postHomieIngest(this.env, listing);
            if (!ingestResp.ok) {
              const detail = await ingestResp.text().catch(() => "");
              console.error(
                JSON.stringify({
                  level: "error",
                  service: "listing-extract-agent",
                  component: "ingest.callback",
                  code: "dependency_failed",
                  postId: listing.postId,
                  status: ingestResp.status,
                  message: detail.slice(0, 200),
                }),
              );
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(
              JSON.stringify({
                level: "error",
                service: "listing-extract-agent",
                component: "ingest.callback",
                code: "dependency_failed",
                postId: listing.postId,
                message,
              }),
            );
          }
        })(),
      );
    }

    return json(202, { ok: true, accepted: true, agent: instanceId });
  }
}

/** Worker entry: route webhooks to Agent instances; otherwise Agents SDK routes. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json(200, { ok: true });
    }

    // POST /webhooks/:postId → durable Agent instance for that listing
    if (url.pathname.startsWith("/webhooks/") && request.method === "POST") {
      const entityId = decodeURIComponent(url.pathname.split("/")[2] || "").trim();
      if (!entityId) {
        return json(400, { error: "webhook entity id required" });
      }
      const agent = await getAgentByName(env.ListingExtractAgent, entityId);
      return agent.fetch(request);
    }

    return (
      (await routeAgentRequest(request, env)) ||
      json(404, { error: "not found" })
    );
  },
} satisfies ExportedHandler<Env>;
