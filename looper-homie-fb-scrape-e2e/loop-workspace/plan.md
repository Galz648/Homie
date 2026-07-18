# plan.md — homie-fb-scrape-e2e

Root branch: `infra`  
Worktree root: `/Users/galzafar/Documents/GitHub/Homie/.worktrees`  
Package branches: `fb-e2e/<id>`  
Merge policy: **operator pass required** before merge into `infra`.

Substrate: **k3s local** (`homie` ns) for Postgres + Temporal. AC runners are **Bun TypeScript** (`bun run check:…`). Playwright worker stays on the host.

## local-postgres

- id: local-postgres
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/Homie/.worktrees/local-postgres
- branch: fb-e2e/local-postgres
- write_paths: infra/k3s/base/scrape-postgres/, infra/k3s/overlays/local/kustomization.yaml, scripts/local-db/, scrapers/facebook/scripts/checkLocalPostgres.ts, drizzle/0000_flat_wolfsbane.sql, drizzle/0001_scrape_cursors.sql
- ac_command: bash -lc 'cd scrapers/facebook && bun run check:postgres'
- notes: k3s scrape-postgres LoadBalancer; Drizzle-only migrate via `scripts/local-db/migrate.ts`. No Docker Compose.

## temporal-local

- id: temporal-local
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/Homie/.worktrees/temporal-local
- branch: fb-e2e/temporal-local
- write_paths: infra/k3s/base/scrape-temporal/, scripts/k3s-local-up.sh, scrapers/facebook/scripts/checkTemporal.ts, scrapers/facebook/README.md
- ac_command: bash -lc 'cd scrapers/facebook && bun run check:temporal'
- notes: k3s Temporal auto-setup (no DYNAMIC_CONFIG_FILE_PATH). Host ports via k3d LB.

## session-ops

- id: session-ops
- deps: local-postgres, temporal-local
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/Homie/.worktrees/session-ops
- branch: fb-e2e/session-ops
- write_paths: scrapers/facebook/src/renewSession.ts, scrapers/facebook/scripts/signal-cookies-renewed.ts, scrapers/facebook/scripts/checkSessionOps.ts, scrapers/facebook/docs/session-renew.md
- ac_command: bash -lc 'cd scrapers/facebook && bun run check:session-ops'
- notes: Reusable renew + signal. Chrome import OK. Auth probe when state present.

## scrape-pipeline

- id: scrape-pipeline
- deps: local-postgres, temporal-local
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/Homie/.worktrees/scrape-pipeline
- branch: fb-e2e/scrape-pipeline
- write_paths: scrapers/facebook/src/activities.ts, scrapers/facebook/src/workflows.ts, scrapers/facebook/src/scrapeRunPolicy.ts, scrapers/facebook/src/pipeline/, scrapers/facebook/scripts/checkScrapePipeline.ts
- ac_command: bash -lc 'cd scrapers/facebook && bun run check:pipeline'
- notes: Cursor → scrape → upsert → watermark; images noop locally.

## e2e-mocks

- id: e2e-mocks
- deps: scrape-pipeline
- parallel_group: C
- worktree: /Users/galzafar/Documents/GitHub/Homie/.worktrees/e2e-mocks
- branch: fb-e2e/e2e-mocks
- write_paths: scrapers/facebook/tests/, scrapers/facebook/scripts/checkE2eMocks.ts, scrapers/facebook/package.json, scrapers/facebook/vitest.config.ts
- ac_command: bash -lc 'cd scrapers/facebook && bun run check:e2e-mocks'
- notes: vitest with mocked Playwright/FB. Uses k3s Postgres.

## e2e-online

- id: e2e-online
- deps: session-ops, scrape-pipeline
- parallel_group: C
- worktree: /Users/galzafar/Documents/GitHub/Homie/.worktrees/e2e-online
- branch: fb-e2e/e2e-online
- write_paths: scrapers/facebook/scripts/checkE2eOnline.ts, scrapers/facebook/scripts/run-online-scrape.ts, scrapers/facebook/src/groups.ts
- ac_command: bash -lc 'cd scrapers/facebook && bun run check:e2e-online'
- notes: Live Temporal workflow for group 35819517694; host worker + k3s Temporal/Postgres.
