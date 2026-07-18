# Parallelization plan — Homie GitOps CD

Root branch: `staging`  
Repo: `/Users/galzafar/Documents/GitHub/Homie`  
Worktree root: `/Users/galzafar/Documents/GitHub/homie-worktrees`  

Judge substitute: current session (user asked to run; Claude CLI egress deferred).  
Human checkpoint: proceed (run approved). Before any worktree: `pkill` git check-ignore.

---

## assert-pin

- id: assert-pin
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/assert-pin
- branch: staging/assert-pin
- write_paths: scripts/k3s/assert-worker-pin.sh, scripts/k3s/check-assert-worker-pin.sh
- ac_command: bash scripts/k3s/check-assert-worker-pin.sh

Adds a lane pin assert script (git overlay `newTag` vs live Deployment image) plus a local AC wrapper that dry-runs without requiring cluster when `HOMIE_ASSERT_PIN_DRY=1`.

---

## trigger-scrape

- id: trigger-scrape
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/trigger-scrape
- branch: staging/trigger-scrape
- write_paths: infra/k3s/platform/argo-workflows/templates/homie-trigger-scrape.yaml, infra/k3s/platform/argo-workflows/examples/ci-trigger-scrape.yaml, infra/k3s/platform/argo-workflows/scripts/check-trigger-scrape.sh
- ac_command: bash infra/k3s/platform/argo-workflows/scripts/check-trigger-scrape.sh

WorkflowTemplate + example Workflow that starts `scrapeFacebookGroup` via `kubectl exec` into scrape-temporal (no admin-tools pull).

---

## docs-cd-loop

- id: docs-cd-loop
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/docs-cd-loop
- branch: staging/docs-cd-loop
- write_paths: infra/SPEC.md, infra/k3s/platform/ci-lane/README.md, infra/k3s/platform/argo-workflows/README.md, infra/k3s/platform/scripts/check-docs-cd-loop.sh
- ac_command: bash infra/k3s/platform/scripts/check-docs-cd-loop.sh

Updates docs so build→pin→Sync is current truth; documents assert-pin + trigger-scrape; removes “pin deferred” as active guidance.

---

## migrate-presync

- id: migrate-presync
- deps: none
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/migrate-presync
- branch: staging/migrate-presync
- write_paths: infra/k3s/base/scrape-db-migrate/, infra/k3s/base/scrape-db-migrate/check-migrate-presync.sh
- ac_command: bash infra/k3s/base/scrape-db-migrate/check-migrate-presync.sh

Ensures ConfigMap + Job both PreSync; README documents hook-delete / OutOfSync; kustomize staging shows lane=staging branch=staging.

---

## pin-from-build

- id: pin-from-build
- deps: assert-pin
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/pin-from-build
- branch: staging/pin-from-build
- write_paths: infra/k3s/platform/argo-workflows/templates/homie-build-images.yaml, infra/k3s/platform/argo-workflows/examples/github-ci-ssh.secret.example.yaml, infra/k3s/platform/argo-workflows/scripts/check-pin-from-build.sh
- ac_command: bash infra/k3s/platform/argo-workflows/scripts/check-pin-from-build.sh

Scaffolds pin-commit step after Kaniko (disabled until Secret present) + deploy-key secret example. No real keys.

---

## platform-wf-app

- id: platform-wf-app
- deps: trigger-scrape
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/platform-wf-app
- branch: staging/platform-wf-app
- write_paths: infra/k3s/argocd/applications/homie-argo-workflows-templates.yaml, infra/k3s/argocd/applications/check-platform-wf-app.sh
- ac_command: bash infra/k3s/argocd/applications/check-platform-wf-app.sh

Argo CD Application manifest for WorkflowTemplates path (GitOps templates; do not apply until operator ready).
