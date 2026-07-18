/**
 * Cloudflare Agent (Agents SDK) for listing extraction.
 *
 * Temporal → POST /webhooks/:postId → ListingExtractAgent.onRequest
 * Agent verifies webhook secret, extracts (stub → later LLM), POSTs Homie ingest.
 * No DATABASE_URL / Hyperdrive — Agent never talks to Postgres.
 */
import { Agent, getAgentByName, routeAgentRequest } from "agents";

import {
  postHomieIngest,
  processListingWebhook,
  type HomieIngestBody,
} from "./listingExtractLogic.js";

export type Env = {
  ListingExtractAgent: DurableObjectNamespace<ListingExtractAgent>;
  HOMIE_CF_AGENT_WEBHOOK_SECRET: string;
  HOMIE_INGEST_BEARER_TOKEN: string;
  HOMIE_INGEST_URL: string;
  HOMIE_CF_AGENT_WEBHOOK_AUTH?: string;
};

export {
  authorizeWebhook,
  hmacHex,
  processListingWebhook,
  stubExtract,
  postHomieIngest,
} from "./listingExtractLogic.js";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * One Durable Object Agent instance per Facebook postId (webhook entity).
 */
export class ListingExtractAgent extends Agent<Env> {
  async onRequest(request: Request): Promise<Response> {
    const bodyText = await request.text();
    const result = await processListingWebhook({
      method: request.method,
      headers: request.headers,
      bodyText,
      env: this.env,
      instanceId: this.name || "unknown",
    });

    if (result.listing) {
      const listing: HomieIngestBody = result.listing;
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

    return json(result.status, result.body);
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
      const entityId = decodeURIComponent(
        url.pathname.split("/")[2] || "",
      ).trim();
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
