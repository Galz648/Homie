# looper-cf-agent-ingest

Parallelization loop: **Cloudflare Agent → Homie `apartment_listings` ingest**.

## Defaults

| | |
|--|--|
| Repo | `/Users/galzafar/Documents/GitHub/Homie` |
| Root branch | `feat/cf-agent-ingest` |
| Worktrees | `/Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest/<package-id>` |
| Auth (Agent → Homie) | Bearer service token (ingest only) |
| Cleaned table | `apartment_listings` (new) |

## Product flow

```text
Temporal scrape (FF activity)
  → CF Agent webhook (raw + instructions + optional output schema)
  → Homie ingest API (Bearer)
  → apartment_listings
  → Slack notify
```

Agent never gets DB credentials.

## Loop flow

```text
+----------------------------------+
| 1. Goal + context                |
+----------------------------------+
               |
               v
+----------------------------------+
| 2. Draft plan.md                 |
| packages + ac_commands           |
+----------------------------------+
               |
               v
+----------------------------------+
| 3. Plan gate                     |
+----------------------------------+
               |
               v
+----------------------------------+
| 4. Worktree → AC → merge → rm    |
| (per package)                    |
+----------------------------------+
               |
               v
+----------------------------------+
| 5. Delivery gate + report        |
+----------------------------------+
```

## Run

Easy path: follow `RUN_IN_SESSION.md` in this chat (or paste it later).

Advanced: `python3 run-loop.py` (external runner).

## Privacy

Host + judge use Claude CLI. Plan/report/diffs may leave the machine to that
CLI; redaction globs apply; first-send consent required.
