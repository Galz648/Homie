# cf-agent-ingest

Parallelize Homie CF Agent ingest: apartment_listings schema, public auth-backed ingest API, Temporal fire-and-forget to Agent webhook, Slack on cleaned insert. Disjoint packages in git worktrees off feat/cf-agent-ingest.

## Goal

Achieve the goal in inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/Homie by decomposing work into disjoint packages. Every package forks from root branch feat/cf-agent-ingest into its own git worktree under /Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest, has non-overlapping write_paths within its parallel_group, and a verifiable ac_command. When a package's acceptance criteria pass, merge its branch into feat/cf-agent-ingest and remove its worktree. Produce PARALLEL-REPORT.md listing each package id, write_paths, AC command + exit evidence, merge commit, and worktree removal confirmation.

## Definition of Done

plan.md lists >=2 packages with id/deps/parallel_group/worktree/branch/ write_paths/ac_command; same-group write_paths are disjoint; PARALLEL-REPORT.md records every package merged with AC pass evidence and worktree removed; feat/cf-agent-ingest contains all package changes; no open worktrees remain for this loop's package ids; no TBD placeholders; goal.md outcomes for apartment_listings, Bearer ingest, Temporal FF, and Slack-on-insert are covered by packages with programmatic ac_commands.

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
- Budget: `{"tokens": 3000000, "usd": 10.0, "wall_clock_min": 180}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same write_paths conflict repeats", "worktree add fails repeatedly without changing approach", "PARALLEL-REPORT.md has no material change after revise", "force-push to root branch proposed", "Agent DATABASE_URL or Hyperdrive proposed"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `worktree`
- Side effects: `{"duplicate_action_check": true, "notes": "Creates git worktrees and branches under /Users/galzafar/Documents/GitHub/homie-worktrees/cf-agent-ingest from feat/cf-agent-ingest. Merges into feat/cf-agent-ingest when AC passes; removes worktrees after merge. Never force-push. Push/PR optional and requires explicit approval. If macOS git hangs, kill stale git check-ignore watchers before worktree operations. Create feat/cf-agent-ingest from current staging tip before first package if the branch does not exist yet.\n", "requires_approval": true}`

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

Stops: pass gates | max 20 iterations | no progress x2 | budget 180m, $10.0, 3000000 tokens
```
