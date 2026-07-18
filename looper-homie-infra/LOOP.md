# homie-local-k3s-infra

Local k3s platform + CI plumbing for Homie on Docker Desktop (k3d): monitoring, Argo CD, Argo Workflows, ci-lane, thin argo-ci GHA under infra/. Cloudflare/Alchemy deploy retired on the infra branch.

## Goal

Stand up Homie-named local k3s platform infrastructure on Docker Desktop (k3d / local k3s). Produce infra/SPEC.md and an operator README, scaffold infra/terraform/stacks/k3s (stub only — do not apply) and infra/k3s/{base stub, overlays/{local,staging,production}, monitoring, argocd, platform/argo-workflows, platform/ci-lane}. Add Homie-named WorkflowTemplate stubs and a thin root .github/workflows/argo-ci.yml that submits Workflows (local k3d context first). Install monitoring, Argo CD, and Argo Workflows via Homie-named install.sh scripts. Do not restore Cloudflare/Alchemy deploy. Do not containerize product code. Do not terraform-apply DigitalOcean in this loop.

## Definition of Done

(1) infra/SPEC.md covers target shape, ownership, lanes, phase-1 platform + CI plumbing, IaC-first secrets, success criteria, CF deploy retired; (2) infra/README.md is the operator map (k3d up, install order, port-forwards, CI); (3) loop-workspace/plan.md lists packages with id/deps/parallel_group/worktree/ac_command; (4) infra tree exists with TF stub + base stub + three overlays + monitoring + argocd + argo-workflows + ci-lane; (5) Homie WorkflowTemplate stubs + .github/workflows/argo-ci.yml present; (6) local k3s/k3d node Ready; (7) monitoring, argocd, and argo namespaces have Ready pods from Homie-named releases; (8) no clinic-* release names remain in Homie packs; (9) operator human signoff; (10) state.json stage=chapter_done.

## Verification

- `plan-approved` (human)
- `ci-plumbing` (programmatic)
- `plan-packages` (programmatic)
- `spec-sections` (programmatic)
- `tree-present` (programmatic)
- `homie-named` (programmatic)
- `install-scripts` (programmatic)
- `k3s-ready` (programmatic)
- `platform-up` (programmatic)
- `operator-signoff` (human)

## Council

- No council members configured.

## Gates

- Plan gate: revise_until_clean
- Delivery gate: revise_until_clean

## Loop Control

- Max iterations: 15
- Budget: `{"wall_clock_min": 240}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["same delivery gate failure repeats", "proposal to containerize Homie-Website or Alchemy", "terraform apply / DO droplet proposed as required for this loop", "clinic-* release names left in Homie packs", "delivery artifact has no material change"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "notes": "Repo edits under infra/ and looper-homie-infra/ are in scope after plan approval. Creating/starting local k3d and helm installs need one operator approval at that step. Commit, push, and any terraform apply / cloud create require explicit approval. Do not modify Homie-Website or app paths.\n", "require_approval": true, "requires_approval": true}`

## Observability

- State file: `state.json`
- Run log: `looper-homie-infra/loop-workspace/run-log.md`
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
| log -> looper-homie-infra/loo~ |
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

Stops: pass gates | max 15 iterations | no progress x2 | budget 240m
```
