# homie-staging-live

Parallel packages: land raw_facebook_posts + Spaces, staging data plane, k8s Temporal worker Deployment, staging-only Slack channel, live FB prove with Spaces uploads — merge onto feat/homie-staging-live.

## Goal

Achieve the goal in inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/Homie by decomposing work into disjoint packages. Every package forks from root branch feat/homie-staging-live into its own git worktree under /Users/galzafar/Documents/GitHub/homie-worktrees, has non-overlapping write_paths within its parallel_group, and a verifiable ac_command. When a package's acceptance criteria pass, merge its branch into feat/homie-staging-live and remove its worktree. Produce PARALLEL-REPORT.md listing each package id, write_paths, AC command + exit evidence, merge commit, and worktree removal confirmation.

## Definition of Done

plan.md lists >=2 packages with id/deps/parallel_group/worktree/branch/ write_paths/ac_command; same-group write_paths are disjoint; PARALLEL-REPORT.md records every package merged with AC pass evidence and worktree removed; feat/homie-staging-live contains all package changes; no open worktrees remain for this loop's package ids (except the optional root checkout homie-staging-live); no TBD placeholders; staging Slack is #homie-runtime-errors-staging only; live prove used Spaces uploads.

## Verification

- `plan-packages` (programmatic)
- `disjoint-paths` (programmatic)
- `report-schema` (programmatic)
- `worktrees-cleaned` (programmatic)
- `plan-disjoint-sound` (judge)
- `merges-complete` (judge)

## Council

- `judge-1`: judge via claude (default)

## Gates

- Plan gate: revise_until_clean
- Delivery gate: revise_until_clean

## Loop Control

- Max iterations: 20
- Budget: `{"tokens": 4000000, "usd": 15.0, "wall_clock_min": 240}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same write_paths conflict repeats", "worktree add fails repeatedly without changing approach", "PARALLEL-REPORT.md has no material change after revise", "force-push to root branch proposed", "staging alerts routed to prod Slack channel"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `worktree`
- Side effects: `{"duplicate_action_check": true, "notes": "Creates git worktrees and branches under /Users/galzafar/Documents/GitHub/homie-worktrees from feat/homie-staging-live. Merges into feat/homie-staging-live when AC passes; removes package worktrees after merge. Never force-push. Push/PR optional and requires explicit approval. If macOS git hangs, kill stale git check-ignore watchers before worktree operations. Root checkout: /Users/galzafar/Documents/GitHub/homie-worktrees/homie-staging-live (create from infra at loop start; do not remove until loop complete).\n", "requires_approval": true}`

## Observability

- State file: `state.json`
- Run log: `run-log.md`
- Checkpoint granularity: `gate`

## Flow Preview

```text
+--------------------------------+
| 1. Goal + context              |
| read sources                   |
+--------------------------------+
               |
               v
+--------------------------------+
| 2. Draft plan.md               |
| state -> state.json            |
+--------------------------------+
               |
               v
+--------------------------------+
| 3. Plan gate                   |
| verdict: judge-1               |
+--------------------------------+
               | needs work -> revise <= 3 -> step 2
               | pass
               v
+--------------------------------+
| 4. Write delivery-N.md         |
| log -> run-log.md              |
+--------------------------------+
               |
               v
+--------------------------------+
| 5. Delivery gate               |
| verdict: judge-1               |
+--------------------------------+
               | needs work -> revise <= 3 -> step 4
               | pass
               v
+--------------------------------+
| 6. Final output                |
| all gates clean                |
+--------------------------------+

Stops: pass gates | max 20 iterations | no progress x2 | budget 240m, $15.0, 4000000 tokens
```
