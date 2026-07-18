# run-log

- scaffolded parallelization loop for local FB scrape e2e (2026-07-18)
- worktrees under repo `.worktrees/`; merge to infra only on operator pass

- plan gate: packages+disjoint ok; branch prefix fb-e2e/* (infra/* invalid)
- created worktrees: local-postgres, temporal-local
- local-postgres AC pass via drizzle-orm migrator (not drizzle-kit TUI; kit hangs)
- removed bootstrap.sql — drizzle-only
- temporal-local AC pass
- awaiting operator pass before merge to infra

- session-ops: chrome Profile 1 cookie import → facebook_state.json; auth probe ok
- session-ops AC pass (signal + docs + auth probe)
- scrape-pipeline AC pass (cursor smoke + typecheck); Temporal compose fixed (removed broken DYNAMIC_CONFIG_FILE_PATH)
- e2e-mocks AC pass (vitest, mocked FB scrape, 3 tests)
- e2e-online: live workflow scraped group 35819517694 → 21 posts upserted, watermark set; AC pass (re-run empty_suspect accepted)
- blocker: operator merge pass required before merging any package into infra

- substrate moved to k3s: scrape-postgres + scrape-temporal in homie ns; k3d LB ports 54329/7233/8233
- Docker Compose scrape e2e retired from AC path
- Python check-*.py replaced by Bun TS: checkLocalPostgres, checkTemporal, checkSessionOps, checkScrapePipeline, checkE2eMocks, checkE2eOnline
- plan.md write_paths/ac_commands updated; plan-packages + disjoint-paths ok
- all six ACs pass against k3s (2026-07-18)
- awaiting operator merge pass
