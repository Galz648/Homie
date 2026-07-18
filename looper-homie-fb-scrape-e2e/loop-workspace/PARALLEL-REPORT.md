# PARALLEL-REPORT — homie-fb-scrape-e2e

Status: all package ACs green on k3s + Bun/TS runners; merges blocked until operator explicit pass.

Root branch: `infra`  
Substrate: k3d `homie-local` → ns `homie` (scrape-postgres, scrape-temporal)  
Host: Bun Playwright worker + `bun run check:*`

## local-postgres

- branch: `fb-e2e/local-postgres`
- write_paths: `infra/k3s/base/scrape-postgres/`, local overlay, `scripts/local-db/`, `checkLocalPostgres.ts`
- ac_command: `bash -lc 'cd scrapers/facebook && bun run check:postgres'`
- AC: pass (exit 0) — k3s scrape-postgres Ready; drizzle migrations; scrape_cursors present
- merge: pending operator
- worktree: `.worktrees/local-postgres` (not removed)

## temporal-local

- branch: `fb-e2e/temporal-local`
- write_paths: `infra/k3s/base/scrape-temporal/`, `scripts/k3s-local-up.sh`, `checkTemporal.ts`, README
- ac_command: `bash -lc 'cd scrapers/facebook && bun run check:temporal'`
- AC: pass (exit 0) — Temporal Ready on `127.0.0.1:7233`
- merge: pending operator
- worktree: `.worktrees/temporal-local` (not removed)

## session-ops

- branch: `fb-e2e/session-ops`
- write_paths: renewSession, signal-cookies-renewed, checkSessionOps, session-renew.md
- ac_command: `bash -lc 'cd scrapers/facebook && bun run check:session-ops'`
- AC: pass (exit 0) — auth probe ok
- merge: pending operator
- worktree: `.worktrees/session-ops` (not removed)

## scrape-pipeline

- branch: `fb-e2e/scrape-pipeline`
- write_paths: activities, workflows, pipeline/, checkScrapePipeline
- ac_command: `bash -lc 'cd scrapers/facebook && bun run check:pipeline'`
- AC: pass (exit 0) — typecheck + cursor smoke
- merge: pending operator
- worktree: `.worktrees/scrape-pipeline` (not removed)

## e2e-mocks

- branch: `fb-e2e/e2e-mocks`
- write_paths: tests/, checkE2eMocks, package.json, vitest.config.ts
- ac_command: `bash -lc 'cd scrapers/facebook && bun run check:e2e-mocks'`
- AC: pass (exit 0) — 3 vitest tests
- merge: pending operator
- worktree: `.worktrees/e2e-mocks` (not removed)

## e2e-online

- branch: `fb-e2e/e2e-online`
- write_paths: checkE2eOnline, run-online-scrape, groups.ts
- ac_command: `bash -lc 'cd scrapers/facebook && bun run check:e2e-online'`
- AC: pass (exit 0) — live group `35819517694`, 21 posts upserted, status ok
- merge: pending operator
- worktree: `.worktrees/e2e-online` (not removed)

Compose scrape stacks retired from AC path. Python `check-*.py` replaced by TypeScript runners.

## Next

Operator: reply **pass** to merge into `infra` and remove worktrees.
