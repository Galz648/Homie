# Run `homie-gitops-cd` In This Session

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
- Run log: `run-log.md`

## Goal

Achieve the goal in inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/Homie by decomposing work into disjoint packages. Every package forks from root branch staging into its own git worktree under /Users/galzafar/Documents/GitHub/homie-worktrees, has non-overlapping write_paths within its parallel_group, and a verifiable ac_command. When a package's acceptance criteria pass, merge its branch into staging and remove its worktree. Produce PARALLEL-REPORT.md listing each package id, write_paths, AC command + exit evidence, merge commit, and worktree removal confirmation. Honor .cursor/rules/no-manual-cluster-mutation.mdc throughout.

## Definition Of Done

plan.md lists >=2 packages with id/deps/parallel_group/worktree/branch/ write_paths/ac_command; same-group write_paths are disjoint; PARALLEL-REPORT.md records every package merged with AC pass evidence and worktree removed; staging contains all package changes; no open worktrees remain for this loop's package ids; no TBD placeholders; no package solved desired-state via kubectl set image or apply -k of staging/production.

## Context Sources

- Read file `./inputs/goal.md`
- Read file `./inputs/rules/no-manual-cluster-mutation.mdc`
- Read file `./inputs/rules/gitops-source-of-truth.mdc`
- Read file `./inputs/rules/macos-git-slowness.mdc`
- Run command `["git", "-C", "/Users/galzafar/Documents/GitHub/Homie", "status", "-sb"]`
- Run command `["git", "-C", "/Users/galzafar/Documents/GitHub/Homie", "branch", "--show-current"]`
- Run command `["git", "-C", "/Users/galzafar/Documents/GitHub/Homie", "worktree", "list"]`

## Verification Criteria

- `plan-packages` programmatic: run `["python3", "scripts/check-plan-packages.py", "loop-workspace/plan.md"]` and expect `exit_zero`
- `disjoint-paths` programmatic: run `["python3", "scripts/check-disjoint-paths.py", "loop-workspace/plan.md"]` and expect `exit_zero`
- `report-schema` programmatic: run `["python3", "scripts/check-parallel-report.py", "loop-workspace/PARALLEL-REPORT.md"]` and expect `exit_zero`
- `worktrees-cleaned` programmatic: run `["python3", "scripts/check-worktrees-cleaned.py", "/Users/galzafar/Documents/GitHub/Homie", "loop-workspace/plan.md"]` and expect `exit_zero`
- `no-manual-mutation-in-report` programmatic: run `["python3", "scripts/check-no-manual-mutation.py", "loop-workspace/PARALLEL-REPORT.md"]` and expect `exit_zero`
- `plan-disjoint-sound` judge rubric: Judge plan.md against inputs/goal.md. Every package must be necessary for the goal or explicitly deferred; write_paths within each parallel_group must be plausibly non-interfering; deps must not create cycles; each ac_command must verify that package's outcome. Verdict revise if packages are fake splits, AC is vibes-only, pin-from-build skips deploy-key scaffold, or the plan relies on kubectl set image.

- `merges-complete` judge rubric: Judge PARALLEL-REPORT.md and git reality on staging. Every planned package not cancelled must show AC pass evidence, merge onto staging, and worktree removal. Verdict revise if merges missing, AC skipped, worktrees remain, or report celebrates manual cluster mutation.


## Council

- `judge-1` judge via `["claude", "-p"]` (non-local; timeout 600s)

## Gates

### plan_gate

- When: `after_plan`
- Policy: `revise_until_clean`
- Verdict source: `judge-1`
- Criteria: `plan-packages, disjoint-paths, plan-disjoint-sound`
- Max revisions: `3`

### delivery_gate

- When: `after_each_delivery`
- Policy: `revise_until_clean`
- Verdict source: `judge-1`
- Criteria: `plan-packages, disjoint-paths, report-schema, worktrees-cleaned, no-manual-mutation-in-report, merges-complete`
- Max revisions: `3`

## Loop Control

- Max iterations: `20`
- Budget: `{"tokens": 3000000, "usd": 10.0, "wall_clock_min": 180}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same write_paths conflict repeats", "worktree add fails repeatedly without changing approach", "PARALLEL-REPORT.md has no material change after revise", "force-push to root branch proposed", "kubectl set image proposed as package solution"]}`
- Human checkpoints: `After plan_gate: confirm package write_paths + deploy-key approach for pin-from-build before worktrees, Before first worktree: pkill git check-ignore watchers; abort if worktree add hangs (macos-git-slowness)`
- Stop conditions:
  - delivery_gate passes clean on PARALLEL-REPORT.md
  - max_iterations reached
  - same blocker repeats for 2 iterations
  - any budget cap exceeded

## Execution Boundary

- Mode: `in_session`
- Isolation: `worktree`
- Side effects: `{"duplicate_action_check": true, "notes": "Creates git worktrees and branches under /Users/galzafar/Documents/GitHub/homie-worktrees from staging. Merges into staging when AC passes; removes worktrees after merge. Never force-push. Push/PR optional and requires explicit approval. Before any worktree add: pkill -f 'git.*check-ignore' and rm -f .git/index.lock. If worktree add hangs >60s, stop and ask human (do not set image). Desired-state changes only via git commits on package branches.\n", "requires_approval": true}`

If the loop needs scheduled runs, child-agent lifecycle management, concurrency control, or restart-safe step retries, stop and tell the user this Looper spec should be handed to a durable orchestrator.

## Observability

- State file: `state.json`
- Run log: `run-log.md`
- Checkpoint granularity: `gate`

Use `state.json` for the latest resumable status and `run-log.md` for the append-only history of what happened.

## Privacy

- Before sending `plan, parallel-report, package-diffs` to `judge-1`, confirm consent and apply redactions `.env, .env.*, secrets/**, **/*.key, **/secrets.auto.tfvars, **/facebook_state.json`.

## Start Now

If the user asked to run now, begin at step 1 under Operator Instructions and keep going until a stop condition is reached.
