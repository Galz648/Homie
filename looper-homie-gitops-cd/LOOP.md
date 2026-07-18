# homie-gitops-cd

Close Homie GitOps CD gaps (assert-pin, trigger-scrape, pin-from-build, migrate PreSync, docs) via disjoint worktree packages off staging with verifiable ACs — no kubectl set image / overlay bypass.

## Goal

Achieve the goal in inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/Homie by decomposing work into disjoint packages. Every package forks from root branch staging into its own git worktree under /Users/galzafar/Documents/GitHub/homie-worktrees, has non-overlapping write_paths within its parallel_group, and a verifiable ac_command. When a package's acceptance criteria pass, merge its branch into staging and remove its worktree. Produce PARALLEL-REPORT.md listing each package id, write_paths, AC command + exit evidence, merge commit, and worktree removal confirmation. Honor .cursor/rules/no-manual-cluster-mutation.mdc throughout.

## Definition of Done

plan.md lists >=2 packages with id/deps/parallel_group/worktree/branch/ write_paths/ac_command; same-group write_paths are disjoint; PARALLEL-REPORT.md records every package merged with AC pass evidence and worktree removed; staging contains all package changes; no open worktrees remain for this loop's package ids; no TBD placeholders; no package solved desired-state via kubectl set image or apply -k of staging/production.

## Verification

- `plan-packages` (programmatic)
- `disjoint-paths` (programmatic)
- `report-schema` (programmatic)
- `worktrees-cleaned` (programmatic)
- `no-manual-mutation-in-report` (programmatic)
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
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same write_paths conflict repeats", "worktree add fails repeatedly without changing approach", "PARALLEL-REPORT.md has no material change after revise", "force-push to root branch proposed", "kubectl set image proposed as package solution"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `worktree`
- Side effects: `{"duplicate_action_check": true, "notes": "Creates git worktrees and branches under /Users/galzafar/Documents/GitHub/homie-worktrees from staging. Merges into staging when AC passes; removes worktrees after merge. Never force-push. Push/PR optional and requires explicit approval. Before any worktree add: pkill -f 'git.*check-ignore' and rm -f .git/index.lock. If worktree add hangs >60s, stop and ask human (do not set image). Desired-state changes only via git commits on package branches.\n", "requires_approval": true}`

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
