# looper-homie-fb-scrape-e2e

Local **Facebook scrape e2e** loop (parallelization template).

## Defaults

| | |
|--|--|
| Repo | `/Users/galzafar/Documents/GitHub/Homie` |
| Root branch | `infra` |
| Worktrees | `/Users/galzafar/Documents/GitHub/Homie/.worktrees/<package-id>` |
| Merge | **Only after you say `pass`** |

## Packages / AC summary

| id | group | AC |
|----|-------|-----|
| local-postgres | A | `check-local-postgres.py` |
| temporal-local | A | `check-temporal-up.py` |
| session-ops | B | reusable renew/signal; human cookie once |
| scrape-pipeline | B | `check-scrape-pipeline.py` |
| e2e-mocks | C | mock e2e suite |
| e2e-online | C | live workflow AC |

## Flow

```text
+---------------------------+
| 1. Goal + plan.md         |
+---------------------------+
              |
              v
+---------------------------+
| 2. Plan gate              |
+---------------------------+
              |
              v
+---------------------------+
| 3. Group A worktrees      |
| local-postgres || temporal|
| AC -> wait operator pass  |
| merge infra, rm worktree  |
+---------------------------+
              |
              v
+---------------------------+
| 4. Group B                |
| session-ops || pipeline   |
| AC -> pass -> merge       |
+---------------------------+
              |
              v
+---------------------------+
| 5. Group C                |
| e2e-mocks || e2e-online   |
| AC -> pass -> merge       |
+---------------------------+
              |
              v
+---------------------------+
| 6. PARALLEL-REPORT.md     |
+---------------------------+
```

## Run

Follow [`RUN_IN_SESSION.md`](./RUN_IN_SESSION.md) after compile.

Do **not** merge package branches into `infra` until you explicitly pass.
