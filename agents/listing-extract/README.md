# listing-extract (Cloudflare Agent stub)

Minimal Worker that:

1. Verifies the Temporal → Agent webhook secret (`Authorization: Bearer …` or `X-Homie-Signature`)
2. Accepts the job with `202` (Temporal does not wait for extraction)
3. POSTs a Homie ingest body to `HOMIE_INGEST_URL/ingest/listings` with `Authorization: Bearer <HOMIE_INGEST_BEARER_TOKEN>`

## Hard rule

This Worker **must not** bind Postgres. `wrangler.toml` and config must never mention `DATABASE_URL` or Hyperdrive. The AC script greps for those tokens and fails if found.

## Contract

Request / response shapes live in `contracts/listing-ingest/`. See ADR `docs/adr/listing-ingest-agent.md`.
