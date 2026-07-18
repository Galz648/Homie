# Run `homie-temporal-worker-k3s` In This Session

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
- State file: `loop-workspace/state.json`
- Run log: `loop-workspace/run-log.md`

## Goal

Achieve the goal in loop-workspace/inputs/goal.md for the repository at /Users/galzafar/Documents/GitHub/Homie: declare Temporal server and the Facebook Temporal worker in infra/k3s YAML, wire staging overlay, add secrets examples and Dockerfile/image stub, and write CHANGE-MAP.md for build/pin follow-ups. Implement in the current workspace on branch infra (no git worktrees).

## Definition Of Done

Staging kustomize build includes scrape-temporal and fb-scrape-worker; secrets.example present; Dockerfile stub present; CHANGE-MAP.md has no TBDs on image/pin/secrets/CI; programmatic checks pass; state chapter_done.

## Context Sources

- Read file `loop-workspace/inputs/goal.md`
- Read file `scrapers/facebook/src/worker.ts`
- Read file `scrapers/facebook/src/config.ts`
- Read file `infra/k3s/base/scrape-temporal/resources.yaml`
- Read file `infra/k3s/overlays/staging/kustomization.yaml`
- Read file `infra/k3s/platform/ci-lane/README.md`

## Verification Criteria

- `plan-packages` programmatic: run `["python3", "scripts/check-plan-packages.py", "loop-workspace/plan.md"]` and expect `exit_zero`
- `staging-kustomize` programmatic: run `["python3", "scripts/check-staging-worker-yaml.py"]` and expect `exit_zero`
- `change-map` programmatic: run `["python3", "scripts/check-change-map.py", "loop-workspace/CHANGE-MAP.md"]` and expect `exit_zero`
- `plan-approved` human signoff: Operator accepts plan.md packages (Temporal lane + worker YAML + image stub + change map); no worktrees; no live secrets.

- `delivery-ok` human signoff: Operator accepts staging YAML + CHANGE-MAP.md; follow-ups (build/pin, session volume) explicit.


## Council

- No council members configured.

## Gates

### plan_gate

- When: `after_plan`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: `plan-packages, plan-approved`
- Max revisions: `3`

### delivery_gate

- When: `after_each_delivery`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: `staging-kustomize, change-map, delivery-ok`
- Max revisions: `3`

## Loop Control

- Max iterations: `10`
- Budget: `{"tokens": 500000, "usd": 1.0, "wall_clock_min": 45}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same blocking issue repeats", "delivery artifact has no material change"]}`
- Human checkpoints: `after_plan, after_delivery`
- Stop conditions:
  - all deliveries pass their gate clean
  - max_iterations reached
  - same blocker repeats for 2 iterations
  - wall_clock budget exceeded

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "notes": "May write infra/k3s YAML and looper workspace docs. Do not push, apply to droplet, or create secrets unless operator asks.\n", "requires_approval": true}`

If the loop needs scheduled runs, child-agent lifecycle management, concurrency control, or restart-safe step retries, stop and tell the user this Looper spec should be handed to a durable orchestrator.

## Observability

- State file: `loop-workspace/state.json`
- Run log: `loop-workspace/run-log.md`
- Checkpoint granularity: `gate`

Use `state.json` for the latest resumable status and `run-log.md` for the append-only history of what happened.

## Privacy

- No cross-vendor egress configured.

## Start Now

If the user asked to run now, begin at step 1 under Operator Instructions and keep going until a stop condition is reached.
