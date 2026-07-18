import { authorizeBearer } from "./auth.js";
import type { ListingIngestBody, ListingStore, SlackNotifier } from "./types.js";

export type IngestAppDeps = {
  bearerToken: string;
  store: ListingStore;
  slack: SlackNotifier;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseBody(raw: unknown): ListingIngestBody | { error: string } {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "body must be a JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  const postId = obj.postId;
  if (typeof postId !== "string" || postId.trim() === "") {
    return { error: "postId is required" };
  }

  const listing: ListingIngestBody = { postId: postId.trim() };

  if ("price" in obj) {
    if (obj.price === null) {
      listing.price = null;
    } else if (typeof obj.price === "number" && Number.isFinite(obj.price)) {
      listing.price = Math.trunc(obj.price);
    } else {
      return { error: "price must be a number or null" };
    }
  }
  if ("currency" in obj) {
    if (obj.currency === null) listing.currency = null;
    else if (typeof obj.currency === "string") listing.currency = obj.currency;
    else return { error: "currency must be a string or null" };
  }
  if ("entryDate" in obj) {
    if (obj.entryDate === null) listing.entryDate = null;
    else if (typeof obj.entryDate === "string") listing.entryDate = obj.entryDate;
    else return { error: "entryDate must be a string or null" };
  }
  if ("contactPhone" in obj) {
    if (obj.contactPhone === null) listing.contactPhone = null;
    else if (typeof obj.contactPhone === "string")
      listing.contactPhone = obj.contactPhone;
    else return { error: "contactPhone must be a string or null" };
  }
  if ("address" in obj) {
    if (obj.address === null) listing.address = null;
    else if (typeof obj.address === "string") listing.address = obj.address;
    else return { error: "address must be a string or null" };
  }
  if ("conditionals" in obj) {
    if (obj.conditionals === null) listing.conditionals = null;
    else if (typeof obj.conditionals === "string")
      listing.conditionals = obj.conditionals;
    else return { error: "conditionals must be a string or null" };
  }

  return listing;
}

export function createIngestHandler(deps: IngestAppDeps) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/healthz") {
      return jsonResponse(200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/ingest/listings") {
      if (!authorizeBearer(req.headers.get("authorization"), deps.bearerToken)) {
        return jsonResponse(401, { error: "unauthorized" });
      }

      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return jsonResponse(400, { error: "invalid JSON body" });
      }

      const parsed = parseBody(raw);
      if ("error" in parsed) {
        return jsonResponse(400, { error: parsed.error });
      }

      try {
        const result = await deps.store.upsert(parsed);
        await deps.slack.notifyListingUpsert({ ...parsed, ...result });
        return jsonResponse(200, {
          ok: true,
          postId: result.postId,
          created: result.created,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[homie-ingest] upsert failed:", message);
        return jsonResponse(500, { error: "upsert failed" });
      }
    }

    return jsonResponse(404, { error: "not found" });
  };
}
