# Goal — local Facebook scrape e2e (Homie)

## Outcome

Develop and prove a **local end-to-end scrape run**:

1. Local Postgres (Supabase-compatible) with Drizzle migrations including `scrape_cursors`
2. Temporal running the Playwright `scrapeFacebookGroup` workflow
3. **Reusable** cookie renew + Temporal `cookies_renewed` signal scripts (ops will re-run these over time)
4. **Mock e2e tests** (no live Facebook)
5. **Online AC** against a real members-only group (requires cookies from session-ops)

Work happens in **git worktrees** under `.worktrees/` in this repo. Merge each package into **`infra` only after the operator says pass**.

## Scope

- `scrapers/facebook/` Temporal worker / Playwright / session scripts
- Local compose + check scripts for Postgres + Temporal
- Drizzle already has `scrape_cursors` on `infra` — consume/migrate locally
- Spaces image upload: local config **off/noop** (prod/staging buckets later)

## Anti-goals

- Committing `facebook_state.json`, Slack tokens, or `.env` secrets
- Force-pushing `infra`
- Merging without operator pass
- Online AC that fakes Facebook when a live session is the requirement
- Hosted Apify / Bright Data for this loop

## Package sketch (see plan.md)

| id | group | deps | Focus |
|----|-------|------|--------|
| local-postgres | A | none | Compose + migrate + check |
| temporal-local | A | none | Temporal up + queue |
| session-ops | B | A | Reusable renew + signal; human cookie login |
| scrape-pipeline | B | A | Cursor → scrape → upsert → watermark (+ mocks in unit path) |
| e2e-mocks | C | scrape-pipeline | Automated tests with mocks |
| e2e-online | C | session-ops, scrape-pipeline | Live workflow AC |

## Definition of done

All packages AC green → operator **pass** per merge → on `infra` → worktrees removed → `PARALLEL-REPORT.md` complete. Mock suite green without cookies; online e2e green with cookies.
