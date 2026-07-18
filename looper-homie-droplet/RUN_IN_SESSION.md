# Run `homie-do-k3s-droplet-parallel` In This Session

Use this prompt when the user wants to run the Looper-designed loop in the current LLM session.
This is the default/easy execution path. The Python runner is the advanced path for running later or outside the session.

## Operator Instructions

You are executing a Looper-designed loop in this current session.
Follow the resolved spec below, write handoff files into the workspace, and enforce the caps manually.
Do not use `run-loop.py` unless the user explicitly asks for the advanced external runner.

1. Create the workspace directory if it does not exist.
2. Read the context sources before drafting the plan.
3. Draft `plan.md` in the workspace.
4. Run the plan gate. Apply programmatic checks when available. For judge criteria, use the configured judge only after consent for any non-local egress; otherwise ask the user to approve a human/current-session substitute.
5. Revise until the gate passes or `max_revisions` is reached.
6. Produce `delivery-N.md` in the workspace.
7. Run the delivery gate after each delivery.
8. Stop when all delivery criteria pass, a cap is reached, or the user stops the loop.
9. Keep `state.json` current with status, iteration, last gate, consent, and blockers.
10. Append a compact entry to `run-log.md` after every context read, model call, check, gate verdict, revision, blocker, and stop decision.
11. Compare each blocker against the previous blocker. If the same blocker repeats for the configured no-progress window, stop or ask for the configured human checkpoint instead of revising again.
12. Treat token and USD budgets as operator limits in this session: if exact accounting is unavailable, stop and ask before continuing when the loop appears likely to exceed them.

## Files

- Source spec: `loop.yaml`
- Human summary: `LOOP.md`
- Resolved spec: `loop.resolved.json`
- Workspace: `./loop-workspace`
- State file: `state.json`
- Run log: `looper-homie-droplet/loop-workspace/run-log.md`

## Goal

Achieve the goal in inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/homie-worktrees/homie-do-droplet by decomposing work into disjoint packages. Every package forks from root branch feat/homie-do-droplet into its own git worktree under /Users/galzafar/Documents/GitHub/homie-worktrees, has non-overlapping write_paths within its parallel_group, and a verifiable ac_command. When a package's acceptance criteria pass, merge its branch into feat/homie-do-droplet and remove its worktree. Produce PARALLEL-REPORT.md listing each package id, write_paths, AC evidence, merge commit, and worktree removal. After scaffolding merges, operator-approved terraform apply + platform install + staging CI proof run on the droplet (sequential; recorded in delivery notes). Droplet size s-4vcpu-8gb; full monitoring; CI pull model polls staging @ 1m into homie-ci-staging with facebook-mock; no GHA kubeconfig primary CI.

## Definition Of Done

plan.md lists packages with id/deps/parallel_group/worktree/branch/ write_paths/ac_command; same-group write_paths are disjoint; PARALLEL-REPORT.md records every package merged with AC pass evidence and worktree removed; feat/homie-do-droplet contains all package changes; no open worktrees remain for this loop's package ids; droplet checks pass (Ready node, full platform, staging CI smoke) after operator apply; state.json stage=chapter_done; no TBD placeholders.

## Context Sources

- Read file `loop-workspace/inputs/goal.md`
- Read file `loop-workspace/inputs/goal-locked.md`
- Read file `loop-workspace/inputs/clinic-ci-pull-notes.md`
- Read file `loop-workspace/inputs/repo-pointers.md`
- Read file `README.md`

## Verification Criteria

- `plan-packages` programmatic: run `["python3", "scripts/check-plan-packages.py", "loop-workspace/plan.md"]` and expect `exit_zero`
- `disjoint-paths` programmatic: run `["python3", "scripts/check-disjoint-paths.py", "loop-workspace/plan.md"]` and expect `exit_zero`
- `report-schema` programmatic: run `["python3", "scripts/check-parallel-report.py", "loop-workspace/PARALLEL-REPORT.md"]` and expect `exit_zero`
- `worktrees-cleaned` programmatic: run `["python3", "scripts/check-worktrees-cleaned.py", "/Users/galzafar/Documents/GitHub/homie-worktrees/homie-do-droplet", "loop-workspace/plan.md"]` and expect `exit_zero`
- `plan-approved` human signoff: Operator approved plan.md packages: disjoint paths, facebook-mock + staging CI + poller shape, TF/platform bring-up as sequential operator steps, no GHA kubeconfig CI.

- `droplet-in-project` programmatic: run `["python3", "scripts/check-droplet-in-project.py"]` and expect `exit_zero`
- `k3s-ready` programmatic: run `["python3", "scripts/check-k3s-ready.py"]` and expect `exit_zero`
- `platform-up` programmatic: run `["python3", "scripts/check-platform-up.py"]` and expect `exit_zero`
- `staging-ci-tree` programmatic: run `["python3", "scripts/check-staging-ci-tree.py"]` and expect `exit_zero`
- `staging-ci-smoke` programmatic: run `["python3", "scripts/check-staging-ci-smoke.py"]` and expect `exit_zero`
- `no-gha-kubeconfig-ci` programmatic: run `["python3", "scripts/check-no-gha-kubeconfig-ci.py"]` and expect `exit_zero`
- `operator-signoff` human signoff: Operator confirms droplet is Homie remote home; packages merged; staging poller CI shape works; droplet left running.


## Council

- No council members configured.

## Gates

### plan_gate

- When: `after_plan`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: `plan-packages, disjoint-paths, plan-approved`
- Max revisions: `3`

### delivery_gate

- When: `after_each_delivery`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: `plan-packages, disjoint-paths, report-schema, worktrees-cleaned, staging-ci-tree, no-gha-kubeconfig-ci, droplet-in-project, k3s-ready, platform-up, staging-ci-smoke, operator-signoff`
- Max revisions: `3`

## Loop Control

- Max iterations: `20`
- Budget: `{"wall_clock_min": 360}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same write_paths conflict repeats", "worktree add fails repeatedly without changing approach", "PARALLEL-REPORT.md has no material change after revise", "force-push to root branch proposed", "HOMIE_K3S_KUBECONFIG proposed as primary CI", "terraform apply without plan approval"]}`
- Human checkpoints: `none`
- Stop conditions:
  - All delivery criteria pass and state.json stage=chapter_done
  - max_iterations or wall_clock exceeded
  - same blocker repeats for 2 iterations

## Execution Boundary

- Mode: `in_session`
- Isolation: `worktree`
- Side effects: `{"duplicate_action_check": true, "notes": "Creates git worktrees and branches under /Users/galzafar/Documents/GitHub/homie-worktrees from feat/homie-do-droplet. Merges into feat/homie-do-droplet when AC passes; removes worktrees after merge. Never force-push. terraform apply, helm install, doctl assign, kubeconfig write, and github-ci-read secret require explicit operator approval. Push/PR requires approval.\n", "require_approval": true, "requires_approval": true}`

If the loop needs scheduled runs, child-agent lifecycle management, concurrency control, or restart-safe step retries, stop and tell the user this Looper spec should be handed to a durable orchestrator.

## Observability

- State file: `state.json`
- Run log: `looper-homie-droplet/loop-workspace/run-log.md`
- Checkpoint granularity: `gate`

Use `state.json` for the latest resumable status and `run-log.md` for the append-only history of what happened.

## Privacy

- No cross-vendor egress configured.

## Start Now

If the user asked to run now, begin at step 1 under Operator Instructions and keep going until a stop condition is reached.
