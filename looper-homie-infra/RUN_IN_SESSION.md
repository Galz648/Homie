# Run `homie-local-k3s-infra` In This Session

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
- Run log: `looper-homie-infra/loop-workspace/run-log.md`

## Goal

Stand up Homie-named local k3s platform infrastructure on Docker Desktop (k3d / local k3s). Produce infra/SPEC.md and an operator README, scaffold infra/terraform/stacks/k3s (stub only — do not apply) and infra/k3s/{base stub, overlays/{local,staging,production}, monitoring, argocd, platform/argo-workflows, platform/ci-lane}. Add Homie-named WorkflowTemplate stubs and a thin root .github/workflows/argo-ci.yml that submits Workflows (local k3d context first). Install monitoring, Argo CD, and Argo Workflows via Homie-named install.sh scripts. Do not restore Cloudflare/Alchemy deploy. Do not containerize product code. Do not terraform-apply DigitalOcean in this loop.

## Definition Of Done

(1) infra/SPEC.md covers target shape, ownership, lanes, phase-1 platform + CI plumbing, IaC-first secrets, success criteria, CF deploy retired; (2) infra/README.md is the operator map (k3d up, install order, port-forwards, CI); (3) loop-workspace/plan.md lists packages with id/deps/parallel_group/worktree/ac_command; (4) infra tree exists with TF stub + base stub + three overlays + monitoring + argocd + argo-workflows + ci-lane; (5) Homie WorkflowTemplate stubs + .github/workflows/argo-ci.yml present; (6) local k3s/k3d node Ready; (7) monitoring, argocd, and argo namespaces have Ready pods from Homie-named releases; (8) no clinic-* release names remain in Homie packs; (9) operator human signoff; (10) state.json stage=chapter_done.

## Context Sources

- Read file `loop-workspace/inputs/homie-infra-plan.md`
- Read file `loop-workspace/inputs/clinic-adaptation-notes.md`
- Read file `README.md`

## Verification Criteria

- `plan-approved` human signoff: Operator approved infra/SPEC.md and loop-workspace/plan.md: local k3s platform + CI plumbing, Homie-named packs, CF deploy stays retired, no DO apply.

- `ci-plumbing` programmatic: run `["python3", "looper-homie-infra/scripts/check-ci-plumbing.py"]` and expect `exit_zero`
- `plan-packages` programmatic: run `["python3", "looper-homie-infra/scripts/check-plan-packages.py"]` and expect `exit_zero`
- `spec-sections` programmatic: run `["python3", "looper-homie-infra/scripts/check-spec-sections.py"]` and expect `exit_zero`
- `tree-present` programmatic: run `["python3", "looper-homie-infra/scripts/check-tree-present.py"]` and expect `exit_zero`
- `homie-named` programmatic: run `["python3", "looper-homie-infra/scripts/check-homie-named.py"]` and expect `exit_zero`
- `install-scripts` programmatic: run `["python3", "looper-homie-infra/scripts/check-install-scripts.py"]` and expect `exit_zero`
- `k3s-ready` programmatic: run `["python3", "looper-homie-infra/scripts/check-k3s-ready.py"]` and expect `exit_zero`
- `platform-up` programmatic: run `["python3", "looper-homie-infra/scripts/check-platform-up.py"]` and expect `exit_zero`
- `operator-signoff` human signoff: Operator confirms local platform packs install cleanly, SPEC/README are accurate, app code was untouched, and no DigitalOcean apply was done.


## Council

- No council members configured.

## Gates

### plan_gate

- When: `after_plan`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: `plan-approved, plan-packages, spec-sections`
- Max revisions: `3`

### delivery_gate

- When: `after_each_delivery`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: `tree-present, homie-named, install-scripts, ci-plumbing, k3s-ready, platform-up, operator-signoff`
- Max revisions: `3`

## Loop Control

- Max iterations: `15`
- Budget: `{"wall_clock_min": 240}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same delivery gate failure repeats", "proposal to containerize Homie-Website or Alchemy", "terraform apply / DO droplet proposed as required for this loop", "clinic-* release names left in Homie packs", "delivery artifact has no material change"]}`
- Human checkpoints: `none`
- Stop conditions:
  - All delivery criteria pass and state.json stage=chapter_done
  - Same blocker twice within no-progress window → stop and ask human
  - max_iterations or wall_clock exceeded → stop with partial state

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "notes": "Repo edits under infra/ and looper-homie-infra/ are in scope after plan approval. Creating/starting local k3d and helm installs need one operator approval at that step. Commit, push, and any terraform apply / cloud create require explicit approval. Do not modify Homie-Website or app paths.\n", "require_approval": true, "requires_approval": true}`

If the loop needs scheduled runs, child-agent lifecycle management, concurrency control, or restart-safe step retries, stop and tell the user this Looper spec should be handed to a durable orchestrator.

## Observability

- State file: `state.json`
- Run log: `looper-homie-infra/loop-workspace/run-log.md`
- Checkpoint granularity: `gate`

Use `state.json` for the latest resumable status and `run-log.md` for the append-only history of what happened.

## Privacy

- No cross-vendor egress configured.

## Start Now

If the user asked to run now, begin at step 1 under Operator Instructions and keep going until a stop condition is reached.
