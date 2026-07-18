# homie-do-k3s-droplet-parallel

Parallel worktree packages for Homie DO k3s droplet: full monitoring, facebook-mock staging CI, 1m staging poller (clinic pull model).

## Goal

Achieve the goal in inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/homie-worktrees/homie-do-droplet by decomposing work into disjoint packages. Every package forks from root branch feat/homie-do-droplet into its own git worktree under /Users/galzafar/Documents/GitHub/homie-worktrees, has non-overlapping write_paths within its parallel_group, and a verifiable ac_command. When a package's acceptance criteria pass, merge its branch into feat/homie-do-droplet and remove its worktree. Produce PARALLEL-REPORT.md listing each package id, write_paths, AC evidence, merge commit, and worktree removal. After scaffolding merges, operator-approved terraform apply + platform install + staging CI proof run on the droplet (sequential; recorded in delivery notes). Droplet size s-4vcpu-8gb; full monitoring; CI pull model polls staging @ 1m into homie-ci-staging with facebook-mock; no GHA kubeconfig primary CI.

## Definition of Done

plan.md lists packages with id/deps/parallel_group/worktree/branch/ write_paths/ac_command; same-group write_paths are disjoint; PARALLEL-REPORT.md records every package merged with AC pass evidence and worktree removed; feat/homie-do-droplet contains all package changes; no open worktrees remain for this loop's package ids; droplet checks pass (Ready node, full platform, staging CI smoke) after operator apply; state.json stage=chapter_done; no TBD placeholders.

## Verification

- `plan-packages` (programmatic)
- `disjoint-paths` (programmatic)
- `report-schema` (programmatic)
- `worktrees-cleaned` (programmatic)
- `plan-approved` (human)
- `droplet-in-project` (programmatic)
- `k3s-ready` (programmatic)
- `platform-up` (programmatic)
- `staging-ci-tree` (programmatic)
- `staging-ci-smoke` (programmatic)
- `no-gha-kubeconfig-ci` (programmatic)
- `operator-signoff` (human)

## Council

- No council members configured.

## Gates

- Plan gate: revise_until_clean
- Delivery gate: revise_until_clean

## Loop Control

- Max iterations: 20
- Budget: `{"wall_clock_min": 360}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same write_paths conflict repeats", "worktree add fails repeatedly without changing approach", "PARALLEL-REPORT.md has no material change after revise", "force-push to root branch proposed", "HOMIE_K3S_KUBECONFIG proposed as primary CI", "terraform apply without plan approval"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `worktree`
- Side effects: `{"duplicate_action_check": true, "notes": "Creates git worktrees and branches under /Users/galzafar/Documents/GitHub/homie-worktrees from feat/homie-do-droplet. Merges into feat/homie-do-droplet when AC passes; removes worktrees after merge. Never force-push. terraform apply, helm install, doctl assign, kubeconfig write, and github-ci-read secret require explicit operator approval. Push/PR requires approval.\n", "require_approval": true, "requires_approval": true}`

## Observability

- State file: `state.json`
- Run log: `looper-homie-droplet/loop-workspace/run-log.md`
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
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 3 -> step 2
               | pass
               v
+--------------------------------+
| 4. Write delivery-N.md         |
| log -> looper-homie-droplet/l~ |
+--------------------------------+
               |
               v
+--------------------------------+
| 5. Delivery gate               |
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 3 -> step 4
               | pass
               v
+--------------------------------+
| 6. Final output                |
| all gates clean                |
+--------------------------------+

Stops: pass gates | max 20 iterations | no progress x2 | budget 360m
```
