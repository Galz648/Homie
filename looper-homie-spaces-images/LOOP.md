# homie-spaces-images

Parallel packages: DO Spaces (staging+production) via Terraform, Spaces image upload in FB scrape pipeline, docs — merge onto feat/homie-spaces-images.

## Goal

Achieve the goal in inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/Homie by decomposing work into disjoint packages. Every package forks from root branch feat/homie-spaces-images into its own git worktree under /Users/galzafar/Documents/GitHub/homie-worktrees, has non-overlapping write_paths within its parallel_group, and a verifiable ac_command. When a package's acceptance criteria pass, merge its branch into feat/homie-spaces-images and remove its worktree. Produce PARALLEL-REPORT.md listing each package id, write_paths, AC command + exit evidence, merge commit, and worktree removal confirmation.

## Definition of Done

plan.md lists >=2 packages with id/deps/parallel_group/worktree/branch/ write_paths/ac_command; same-group write_paths are disjoint; PARALLEL-REPORT.md records every package merged with AC pass evidence and worktree removed; feat/homie-spaces-images contains all package changes; no open worktrees remain for this loop's package ids (except the optional root checkout homie-spaces-images); no TBD placeholders; Spaces keys never committed.

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
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same write_paths conflict repeats", "worktree add fails repeatedly without changing approach", "PARALLEL-REPORT.md has no material change after revise", "force-push to root branch proposed"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `worktree`
- Side effects: `{"duplicate_action_check": true, "notes": "Creates git worktrees and branches under /Users/galzafar/Documents/GitHub/homie-worktrees from feat/homie-spaces-images. Merges into feat/homie-spaces-images when AC passes; removes package worktrees after merge. Never force-push. Push/PR optional and requires explicit approval. If macOS git hangs, kill stale git check-ignore watchers before worktree operations. Root checkout already exists at /Users/galzafar/Documents/GitHub/homie-worktrees/homie-spaces-images (do not remove until loop complete / operator says so).\n", "requires_approval": true}`

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
