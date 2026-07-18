import { authorizeBearer } from "./auth.js";
import { logIngestError } from "./log.js";
import type {
  ListingIngestBody,
  ListingStore,
  RuntimeErrorAlerter,
  SlackNotifier,
  UpsertResult,
} from "./types.js";

export type IngestAppDeps = {
  bearerToken: string;
  store: ListingStore;
  slack: SlackNotifier;
  runtimeErrors: RuntimeErrorAlerter;
  /** Lane label for structured logs / alerts (`HOMIE_LANE`). */
  env?: string;
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
    else if (typeof obj.contactPhone === "string") listing.contactPhone = obj.contactPhone;
    else return { error: "contactPhone must be a string or null" };
  }
  if ("address" in obj) {
    if (obj.address === null) listing.address = null;
    else if (typeof obj.address === "string") listing.address = obj.address;
    else return { error: "address must be a string or null" };
  }
  if ("conditionals" in obj) {
    if (obj.conditionals === null) listing.conditionals = null;
    else if (typeof obj.conditionals === "string") listing.conditionals = obj.conditionals;
    else return { error: "conditionals must be a string or null" };
  }
  if ("images" in obj) {
    // Test-only convenience for createMemoryStore — createDrizzleStore always
    // ignores this and copies images from raw_facebook_posts by postId.
    if (Array.isArray(obj.images) && obj.images.every((entry) => typeof entry === "string")) {
      listing.images = obj.images as string[];
    } else {
      return { error: "images must be an array of strings" };
    }
  }

  return listing;
}

async function reportSlackNotifyFailure(args: {
  runtimeErrors: RuntimeErrorAlerter;
  env: string;
  postId: string;
  err: unknown;
}): Promise<void> {
  const message = args.err instanceof Error ? args.err.message : String(args.err);
  logIngestError({
    level: "error",
    service: "homie-ingest",
    component: "ingest.slack",
    code: "dependency_failed",
    message,
    postId: args.postId,
    env: args.env,
  });
  try {
    await args.runtimeErrors.alert({
      component: "ingest.slack",
      code: "dependency_failed",
      summary: "Success-channel Slack notify failed after apartment_listings upsert",
      evidence: [
        `postId: \`${args.postId}\``,
        `detail: ${message}`,
        "DB write succeeded; client received 200",
      ],
    });
  } catch (alertErr) {
    const alertMessage = alertErr instanceof Error ? alertErr.message : String(alertErr);
    logIngestError({
      level: "error",
      service: "homie-ingest",
      component: "ingest.runtime_errors_alert",
      code: "dependency_failed",
      message: alertMessage,
      postId: args.postId,
      env: args.env,
    });
  }
}

export function createIngestHandler(deps: IngestAppDeps) {
  const lane = deps.env ?? "local";

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

      let result: UpsertResult;
      try {
        result = await deps.store.upsert(parsed);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logIngestError({
          level: "error",
          service: "homie-ingest",
          component: "ingest.upsert",
          code: "dependency_failed",
          message,
          postId: parsed.postId,
          env: lane,
        });
        return jsonResponse(500, { error: "upsert failed" });
      }

      try {
        await deps.slack.notifyListingUpsert({ ...parsed, ...result });
      } catch (err) {
        // Upsert already committed — never 500 the client for notify failure.
        await reportSlackNotifyFailure({
          runtimeErrors: deps.runtimeErrors,
          env: lane,
          postId: result.postId,
          err,
        });
      }

      return jsonResponse(200, {
        ok: true,
        postId: result.postId,
        created: result.created,
      });
    }

    return jsonResponse(404, { error: "not found" });
  };
}
