# Goal: Cloudflare Agent → Homie cleaned listing ingest

## Outcome

Ship on branch `feat/cf-agent-ingest` an end-to-end path where:

1. **Schema** — Drizzle adds table `apartment_listings` (cleaned/extracted
   listings). Migration lands under `drizzle/`. This is the write target for
   LLM/Agent output — **not** `raw_facebook_posts`.

2. **Public auth-backed ingest API** (Homie on k3s / lane Service + HTTPS
   front door as needed) accepts POSTs that upsert `apartment_listings`.
   Authentication: **Bearer service token** scoped to ingest only
   (`Authorization: Bearer …`). Reject missing/wrong tokens. Idempotent
   upsert keyed by Facebook `postId` (or stable event id from the scrape).

3. **Temporal fire-and-forget** — A new activity in the Facebook scrape
   workflow POSTs raw post text (plus instructions) to the Cloudflare Agent
   webhook and does **not** wait for extraction to finish. Temporal → Agent
   auth is a separate shared secret / HMAC on the Agent webhook (not DB).

4. **Agent contract** — Request carries raw/unstructured input, extraction
   instructions, and an **optional** output schema/structure. Response /
   Homie callback carries:
   - **Structured:** price, entry date, contact phone, address (and any
     schema-required fields)
   - **Unstructured:** annoying conditionals / caveats as freeform text
   Agent has **no** `DATABASE_URL` / Hyperdrive. It calls Homie ingest with
   the Bearer token only.

5. **Slack** — On successful write to `apartment_listings`, notify the
   appropriate Homie Slack channel (reuse existing Slack secret / notify
   helpers; staging vs prod channel conventions from IaC).

## Scope

**In**

- `apartment_listings` Drizzle model + SQL migration
- Homie ingest endpoint + Bearer auth + validation
- Temporal FF activity + scrape workflow wiring
- CF Agent webhook receive + callback-to-Homie shape (repo docs and/or
  Agent project scaffolding as planned in packages)
- Shared request/response contract kept in sync (typed schema or OpenAPI /
  JSON Schema checked by tests)
- Slack notify on cleaned insert
- IaC/secrets examples for ingest token and Agent webhook secret (examples
  only — never real secrets)

**Out**

- Giving the Agent direct Postgres / Hyperdrive
- Replacing raw scrape upsert into `raw_facebook_posts`
- Reviving legacy `apartment_posts` as-is (new table name is
  `apartment_listings`)
- Production promote / live FB e2e as a blocking AC for this loop
- Restoring Cloudflare as Homie primary deploy home

## Context sources (must read)

- `Homie-Website/src/db/schema.ts` — current tables
- `docs/workstreams.md` — W3.1 / W3.4 write-path intent
- `scrapers/facebook/` — Temporal worker / workflow
- Existing Slack notify patterns under scrapers
- This file

## Suggested package split (host may revise; keep write_paths disjoint)

| id (example) | parallel_group | Likely write_paths focus | Example verifiable AC |
|--------------|----------------|--------------------------|------------------------|
| schema-listings | A | `Homie-Website/src/db/schema.ts`, `drizzle/` | migration applies; schema exports `apartmentListings` / table `apartment_listings` |
| ingest-api | B | Homie API / k8s ingest Service, secrets.example | unauthenticated POST → 401; valid Bearer + body → upsert row (unit/contract test) |
| temporal-ff | B | `scrapers/facebook/` activity + workflow | activity posts and returns without waiting on Agent completion (unit test / mock) |
| agent-contract | C | contract doc + shared types/schema + Agent | schema/fixture round-trip; Agents SDK markers; no DB |
| argo-deploy-agent | D | Argo WorkflowTemplate wrangler deploy | `check-argo-deploy-listing-agent.py` |
| slack-cleaned | C | Slack notify on ingest success | folded into ingest-api |

Exact ids/`write_paths`/`ac_command` live in `loop-workspace/plan.md`.

## Definition of done

- All planned packages merged into `feat/cf-agent-ingest` with passing
  `ac_command` evidence in `PARALLEL-REPORT.md`
- Worktrees under `…/homie-worktrees/cf-agent-ingest` removed for those
  package ids
- No secrets committed; Agent cannot reach Postgres
- Cleaned writes target `apartment_listings`; Slack tied to that write path
- Argo can deploy the Agent via `homie-deploy-listing-agent` (token Secret
  out-of-band)

## Anti-goals

- Overlapping same-group `write_paths`
- Force-push root branch
- Vibes-only AC (“looks good”)
- Dual-write cleaned fields into `raw_facebook_posts`
