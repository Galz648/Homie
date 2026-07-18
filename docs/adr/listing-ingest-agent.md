# ADR: Listing ingest via Cloudflare Agent

## Status

Accepted (feat/cf-agent-ingest)

## Context

Homie scrapes Facebook posts into `raw_facebook_posts`. Cleaned / LLM-extracted
fields belong in `apartment_listings`, written only through Homie ingest
(`POST /ingest/listings`). Temporal must not block the scrape workflow on LLM
latency; the Cloudflare Agent must not hold a database credential.

## Decision

### Flow

1. After a successful raw upsert, Temporal activity `notifyListingAgent` POSTs
   to the Agent webhook and returns on HTTP 2xx (fire-and-forget).
2. Agent verifies the webhook secret, extracts fields (LLM or stub), then
   callbacks Homie ingest with a Bearer service token.
3. Homie upserts `apartment_listings` by `postId` and notifies Slack.

### Auth

| Hop | Mechanism | Secret / env |
|-----|-----------|--------------|
| Temporal → Agent | Shared secret: `Authorization: Bearer <secret>` (default) or HMAC `X-Homie-Signature: sha256=<hex>` | Worker: `HOMIE_CF_AGENT_WEBHOOK_SECRET`; scrape worker: same value via `HOMIE_CF_AGENT_WEBHOOK_SECRET`. Mode via `HOMIE_CF_AGENT_WEBHOOK_AUTH` = `bearer` \| `hmac`. |
| Agent → Homie | `Authorization: Bearer <token>` on `POST /ingest/listings` | Agent: `HOMIE_INGEST_BEARER_TOKEN`; Homie ingest Deployment: same token. |

Secrets stay out of git (wrangler secrets / k8s Secrets / `*.example.yaml` only).

### Contract shapes

Kept under `contracts/listing-ingest/`:

- **Agent request** (`agent-request.schema.json`): `text`, `instructions`,
  optional `outputSchema`, plus optional `postId` / `groupId` / `url`.
  Matches `scrapers/facebook/src/notifyListingAgent.ts`.
- **Homie ingest body** (`homie-ingest-body.schema.json`): required `postId`;
  optional `price`, `currency`, `entryDate`, `contactPhone`, `address`,
  `conditionals`. Matches `services/homie-ingest` `ListingIngestBody`.

Fixtures round-trip through `python3 scripts/check-listing-ingest-contract.py`.
If fixtures or Agent config drift (including forbidden `DATABASE_URL` /
Hyperdrive in `agents/listing-extract`), the check fails.

### Anti-goals

- Agent Hyperdrive / `DATABASE_URL` / direct Postgres
- Dual-write cleaned fields into `raw_facebook_posts`
- Temporal waiting on Agent extraction or Homie callback

## Consequences

- Contract tests are the sync rule between Temporal payload, Agent stub, and
  Homie ingest types.
- Staging/prod rotate two secrets independently (webhook vs ingest Bearer).
- Full LLM extraction can replace the stub without changing the wire schemas.
