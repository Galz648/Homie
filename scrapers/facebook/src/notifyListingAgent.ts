/**
 * Temporal → Cloudflare Agent webhook (fire-and-forget).
 *
 * POSTs raw listing text + instructions (+ optional outputSchema) and returns
 * as soon as the Agent HTTP endpoint accepts (2xx). Does **not** poll Homie
 * or wait for extraction / ingest callback — Agent work continues async.
 */
import { createHmac } from "node:crypto";

export const DEFAULT_LISTING_EXTRACT_INSTRUCTIONS =
  "Extract apartment listing fields from the raw Facebook post text. " +
  "Return structured price, entry/available date, contact phone, address, " +
  "and unstructured conditionals/caveats as freeform text. " +
  "Callback to Homie ingest with the Bearer token; do not expect Temporal to wait.";

/** Optional JSON Schema hint for Agent extraction (Agent contract). */
export const DEFAULT_LISTING_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    postId: { type: "string" },
    price: { type: ["number", "null"] },
    entryDate: { type: ["string", "null"], description: "ISO date or null" },
    contactPhone: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    conditionals: {
      type: ["string", "null"],
      description: "Annoying caveats / freeform unstructured notes",
    },
  },
  required: ["postId"],
};

export type NotifyListingAgentPayload = {
  /** Raw / unstructured listing text from the Facebook post. */
  text: string;
  /** Extraction instructions for the Agent. */
  instructions?: string;
  /** Optional output structure hint (JSON Schema or plain object). */
  outputSchema?: Record<string, unknown>;
  postId?: string;
  groupId?: string;
  url?: string;
};

export type NotifyListingAgentConfig = {
  webhookUrl: string | undefined;
  webhookSecret: string | undefined;
  /** `bearer` (default) → Authorization: Bearer …; `hmac` → X-Homie-Signature. */
  authMode?: "bearer" | "hmac";
};

export type NotifyListingAgentResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; status: number }
  | { ok: false; status: number; detail: string };

export type NotifyListingAgentDeps = {
  fetchFn?: typeof fetch;
  config?: NotifyListingAgentConfig;
};

function resolveConfig(
  overrides?: NotifyListingAgentConfig,
): NotifyListingAgentConfig {
  if (overrides) return overrides;
  const authRaw = (
    process.env.HOMIE_CF_AGENT_WEBHOOK_AUTH ?? "bearer"
  ).toLowerCase();
  return {
    webhookUrl: process.env.HOMIE_CF_AGENT_WEBHOOK_URL?.trim() || undefined,
    webhookSecret:
      process.env.HOMIE_CF_AGENT_WEBHOOK_SECRET?.trim() || undefined,
    authMode: authRaw === "hmac" ? "hmac" : "bearer",
  };
}

function buildAuthHeaders(
  secret: string | undefined,
  body: string,
  authMode: "bearer" | "hmac",
): Record<string, string> {
  if (!secret) return {};
  if (authMode === "hmac") {
    const digest = createHmac("sha256", secret).update(body).digest("hex");
    return { "X-Homie-Signature": `sha256=${digest}` };
  }
  return { Authorization: `Bearer ${secret}` };
}

/**
 * POST one listing to the CF Agent webhook. Returns after HTTP accept (2xx).
 * No-ops when `HOMIE_CF_AGENT_WEBHOOK_URL` is unset (local e2e safe).
 */
export async function notifyListingAgent(
  payload: NotifyListingAgentPayload,
  deps: NotifyListingAgentDeps = {},
): Promise<NotifyListingAgentResult> {
  const config = resolveConfig(deps.config);
  const fetchFn = deps.fetchFn ?? fetch;

  if (!config.webhookUrl) {
    return {
      ok: true,
      skipped: true,
      reason: "HOMIE_CF_AGENT_WEBHOOK_URL unset",
    };
  }

  const bodyObj = {
    text: payload.text,
    instructions:
      payload.instructions ?? DEFAULT_LISTING_EXTRACT_INSTRUCTIONS,
    ...(payload.outputSchema !== undefined
      ? { outputSchema: payload.outputSchema }
      : { outputSchema: DEFAULT_LISTING_OUTPUT_SCHEMA }),
    ...(payload.postId ? { postId: payload.postId } : {}),
    ...(payload.groupId ? { groupId: payload.groupId } : {}),
    ...(payload.url ? { url: payload.url } : {}),
  };
  const body = JSON.stringify(bodyObj);
  const authMode = config.authMode ?? "bearer";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildAuthHeaders(config.webhookSecret, body, authMode),
  };

  const res = await fetchFn(config.webhookUrl, {
    method: "POST",
    headers,
    body,
  });

  if (res.status >= 200 && res.status < 300) {
    return { ok: true, skipped: false, status: res.status };
  }

  const detail = await res.text().catch(() => "");
  return {
    ok: false,
    status: res.status,
    detail: detail.slice(0, 500) || `HTTP ${res.status}`,
  };
}
