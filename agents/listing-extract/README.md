# listing-extract (Cloudflare Agent)

Homie listing extraction **Agent** on the Cloudflare Agents SDK (`agents`
package) — not a bare Worker `fetch` handler.

## Architecture

- `ListingExtractAgent` extends `Agent` (Durable Object + SQLite)
- Temporal POSTs ` /webhooks/:postId` → `getAgentByName` → `onRequest`
- Verifies Temporal → Agent webhook secret (Bearer or HMAC)
- Returns `202` quickly (fire-and-forget); Homie ingest callback via `waitUntil`
- POSTs cleaned body to `HOMIE_INGEST_URL/ingest/listings` with Bearer token

## Hard rule

This Agent **must not** bind Postgres. `wrangler.toml` must never mention
`DATABASE_URL` or Hyperdrive. `scripts/check-listing-ingest-contract.py` greps
for those tokens.

## Secrets

```bash
cd agents/listing-extract
wrangler secret put HOMIE_CF_AGENT_WEBHOOK_SECRET
wrangler secret put HOMIE_INGEST_BEARER_TOKEN
wrangler secret put HOMIE_INGEST_URL
```

Same webhook + ingest Bearer values live in staging k8s
(`homie-cf-agent-webhook`, `homie-ingest`).

## Deploy

```bash
cd agents/listing-extract
bun install
wrangler deploy
# Then set scrape worker HOMIE_CF_AGENT_WEBHOOK_URL to
#   https://<worker>.workers.dev/webhooks
# Temporal appends /:postId
```

## Local mocked e2e

No wrangler / live CF needed — pure auth + stub extract + ingest fetch:

```bash
cd agents/listing-extract
bun run check:e2e-mocks
```

Full scrape → notify → agent → ingest mock gate (Postgres required for scrape):

```bash
cd scrapers/facebook && bun run check:e2e-mocks
```

## Contract

Request / response shapes: `contracts/listing-ingest/`.  
ADR: `docs/adr/listing-ingest-agent.md`.
