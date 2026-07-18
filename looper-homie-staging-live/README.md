# looper-homie-staging-live

Parallelization loop: **staging live FB scrape** (k8s worker + Spaces +
staging-only Slack).

| | |
|--|--|
| Template | `parallelization` |
| Repo | `/Users/galzafar/Documents/GitHub/Homie` |
| Root branch | `feat/homie-staging-live` (from `infra`) |
| Root worktree | `/Users/galzafar/Documents/GitHub/homie-worktrees/homie-staging-live` |
| Package worktrees | `/Users/galzafar/Documents/GitHub/homie-worktrees/<pkg-id>` |
| Package branches | `pkg/<id>` |

## Staging Slack

| | |
|--|--|
| Channel | `#homie-runtime-errors-staging` |
| ID | `C0BJ6AMH2LE` |
| Env | `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID` in `~/.config/homie/slack.env` |
| Test | Smoke message posted at channel creation |

## Run

```bash
# Prefer in-session: open RUN_IN_SESSION.md and follow it
# Or external:
./run-loop.py
```

## Privacy

Judge CLI is Claude (non-local). Plan/report/diffs leave the machine when the
judge runs; redaction globs apply; **first-send consent required**.
