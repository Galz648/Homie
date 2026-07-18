# Plan: cf-agent-ingest

Root branch: `feat/cf-agent-ingest` (create from `staging` tip before first worktree if missing).  
Worktree root: `/Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest`  
Repo: `/Users/galzafar/Documents/GitHub/Homie`

## Prerequisite (operator-approved side effect)

1. Kill stale git watchers if needed (`pkill -f 'git.*check-ignore'`).
2. `git -C Homie branch feat/cf-agent-ingest staging` (or checkout -b) if absent.
3. Do not push unless explicitly approved.

## Package protocol (every package)

1. `git worktree add -b feat/cf-agent-ingest--<id> <WORKTREE_ROOT>/<id> feat/cf-agent-ingest`
   (Note: cannot use `feat/cf-agent-ingest/<id>` — git ref nesting conflicts with the root branch name.)
2. Work only under `write_paths`
3. Run `ac_command` from repo root of that worktree → exit 0
4. Merge into `feat/cf-agent-ingest` (ff-only preferred; merge commit OK). Never force-push.
5. `git worktree remove <path>` and record in PARALLEL-REPORT.md

---

## schema-listings

- id: schema-listings
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest/schema-listings
- branch: feat/cf-agent-ingest--schema-listings
- write_paths: Homie-Website/src/db/schema.ts, drizzle/0003_apartment_listings.sql, scripts/check-apartment-listings-schema.py
- ac_command: python3 scripts/check-apartment-listings-schema.py

**Work:** Add Drizzle `apartmentListings` → table `apartment_listings` with cleaned fields (price/rent, entry/available date, contact phone, address, unstructured conditionals text, link to raw `postId`, timestamps). Add SQL migration `drizzle/0003_apartment_listings.sql`. AC script asserts schema export + migration file name the table and required columns.

**Merge notes:** Land first; other packages depend on types/table existing conceptually.

---

## ingest-api

- id: ingest-api
- deps: schema-listings
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest/ingest-api
- branch: feat/cf-agent-ingest--ingest-api
- write_paths: services/homie-ingest/, infra/k3s/base/homie-ingest/, scripts/apply-homie-ingest-secret.sh, scripts/check-homie-ingest-api.py, infra/k3s/overlays/local/secrets.example.yaml, infra/k3s/overlays/staging/secrets.example.yaml, infra/k3s/overlays/production/secrets.example.yaml
- ac_command: python3 scripts/check-homie-ingest-api.py

**Work:** New Bun/Node in-cluster ingest service: `POST /ingest/listings` with **Bearer** service token; validate body; idempotent upsert into `apartment_listings` by `postId`; **Slack notify on successful write** (reuse chat.postMessage patterns; env channel id). k8s base Deployment/Service/ConfigMap + secret example `HOMIE_INGEST_BEARER_TOKEN`. No Agent DB access. AC: contract tests — missing/wrong Bearer → 401; valid Bearer + fixture → upsert path exercised (mocked DB OK); Slack helper invoked on success (mock).

**Note:** Slack-on-cleaned-insert is included here so `services/homie-ingest/` is not split across packages.

---

## temporal-ff

- id: temporal-ff
- deps: schema-listings
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest/temporal-ff
- branch: feat/cf-agent-ingest--temporal-ff
- write_paths: scrapers/facebook/src/notifyListingAgent.ts, scrapers/facebook/src/activities.ts, scrapers/facebook/src/workflows.ts, scrapers/facebook/src/worker.ts, scrapers/facebook/src/config.ts, scrapers/facebook/tests/notifyListingAgent.test.ts, scrapers/facebook/scripts/check-temporal-ff-agent.py, infra/k3s/base/fb-scrape-worker/configmap.yaml, infra/k3s/base/fb-scrape-worker/deployment.yaml
- ac_command: python3 scrapers/facebook/scripts/check-temporal-ff-agent.py

**Work:** Fire-and-forget activity: POST raw post text + instructions + optional output schema to CF Agent webhook URL; HMAC/shared-secret header for Temporal→Agent; activity returns after accept (does not wait for extraction/Homie callback). Wire into `scrapeFacebookGroup` after successful raw upsert batch (or per new post — document choice in activity). Env examples only in ConfigMap keys (`HOMIE_CF_AGENT_WEBHOOK_URL`, `HOMIE_CF_AGENT_WEBHOOK_SECRET`). AC: unit test proves fetch called and activity resolves without awaiting Agent completion; check script runs that test.

---

## agent-contract

- id: agent-contract
- deps: ingest-api, temporal-ff
- parallel_group: C
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest/agent-contract
- branch: feat/cf-agent-ingest--agent-contract
- write_paths: contracts/listing-ingest/, agents/listing-extract/, scripts/check-listing-ingest-contract.py, docs/adr/listing-ingest-agent.md
- ac_command: python3 scripts/check-listing-ingest-contract.py

**Work:** Shared JSON Schema for Agent request and Homie ingest body. Cloudflare
**Agents SDK** project (`ListingExtractAgent extends Agent`, DO + SQLite in
wrangler.toml). Temporal POSTs `/webhooks/:postId`. No DATABASE_URL/Hyperdrive.
ADR documents auth. AC: fixtures + Agents SDK markers + forbidden DB grep.

---

## argo-deploy-agent

- id: argo-deploy-agent
- deps: agent-contract
- parallel_group: D
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest/argo-deploy-agent
- branch: feat/cf-agent-ingest--argo-deploy-agent
- write_paths: infra/k3s/platform/argo-workflows/templates/homie-deploy-listing-agent.yaml, infra/k3s/platform/argo-workflows/examples/ci-deploy-listing-agent.yaml, infra/k3s/platform/argo-workflows/examples/cloudflare-api-token.secret.example.yaml, infra/k3s/platform/argo-workflows/README.md, scripts/apply-cloudflare-api-token-secret.sh, scripts/check-argo-deploy-listing-agent.py
- ac_command: python3 scripts/check-argo-deploy-listing-agent.py

**Work:** Argo WorkflowTemplate `homie-deploy-listing-agent`: clone branch →
`bun install` → `wrangler deploy` for `agents/listing-extract`. Token Secret
`cloudflare-api-token` in `argo` (example + apply script). Manual Workflow
example. Does **not** require live deploy for AC — template + example +
wrangler Agent markers must exist.

---

## Parallel groups

```text
Group A: schema-listings
    |
    +-- Group B (parallel): ingest-api || temporal-ff
              |
              v
         Group C: agent-contract
              |
              v
         Group D: argo-deploy-agent
```

## Deferred (explicit)

- Public Ingress/TLS front door for Homie ingest on droplet (may stub Service + document Tailscale/port-forward for staging proof; full Ingress can follow in a later loop)
- Live Facebook e2e / production promote
- Overlay `kustomization.yaml` resource wiring beyond secrets.example (optional follow-up if base alone is insufficient for local apply — prefer adding only named overlay patches in ingest-api if required for AC)
- Live Argo run of `homie-deploy-listing-agent` (needs operator Cloudflare API token Secret + cluster apply)

## Anti-goals reminder

No Agent Hyperdrive/DB; no cleaned writes to `raw_facebook_posts`; no force-push; no real secrets in git.
