# Plan — Homie DO droplet (parallel packages)

Root branch: `feat/homie-do-droplet`  
Worktree root: `/Users/galzafar/Documents/GitHub/homie-worktrees`  
Repo: `/Users/galzafar/Documents/GitHub/homie-worktrees/homie-do-droplet`

## Package facebook-mock

- id: facebook-mock
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/facebook-mock
- branch: pkg/facebook-mock
- write_paths: infra/k3s/base/facebook-mock
- ac_command: test -f infra/k3s/base/facebook-mock/kustomization.yaml && test -f infra/k3s/base/facebook-mock/deployment.yaml && test -f infra/k3s/base/facebook-mock/service.yaml

Clinic shape (Deployment + Service + kustomization), Homie-named, mocks Facebook external API for staging CI.

## Package staging-ci

- id: staging-ci
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/staging-ci
- branch: pkg/staging-ci
- write_paths: infra/k3s/platform/argo-workflows/templates/homie-ci-staging.yaml, infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml
- ac_command: test -f infra/k3s/platform/argo-workflows/templates/homie-ci-staging.yaml && test -f infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml && grep -q staging infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml

`homie-ci-staging` WorkflowTemplate + 1m staging-tip poll CronJob (pull model). May reference facebook-mock Service DNS; mock manifests land via package facebook-mock.

## Package ci-docs-pull

- id: ci-docs-pull
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/ci-docs-pull
- branch: pkg/ci-docs-pull
- write_paths: infra/k3s/platform/argo-workflows/README.md, infra/k3s/platform/ci-lane/README.md
- ac_command: grep -qiE 'pull|poll' infra/k3s/platform/argo-workflows/README.md && ! grep -qiE 'HOMIE_K3S_KUBECONFIG.*primary' infra/k3s/platform/argo-workflows/README.md

Document pull/poll primary CI; demote GHA kubeconfig submit.

## Package staging-overlay

- id: staging-overlay
- deps: facebook-mock
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/staging-overlay
- branch: pkg/staging-overlay
- write_paths: infra/k3s/overlays/staging
- ac_command: test -f infra/k3s/overlays/staging/kustomization.yaml && grep -q facebook-mock infra/k3s/overlays/staging/kustomization.yaml

Wire staging overlay to include facebook-mock (clinic overlay pattern).

## Package slack-apply-scripts

- id: slack-apply-scripts
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/slack-apply-scripts
- branch: pkg/slack-apply-scripts
- write_paths: scripts/apply-grafana-slack-secret.sh, scripts/apply-argocd-slack-secret.sh
- ac_command: test -x scripts/apply-grafana-slack-secret.sh && test -x scripts/apply-argocd-slack-secret.sh

Port clinic apply scripts → `~/.config/homie/slack.env` (optional for droplet; scripts only).

## Sequential after merges (not a git package — operator)

1. Fill TF secrets out-of-band → `terraform plan` → **approve** → `apply`
2. Assign droplet to Homie project; fetch kubeconfig → `homie-k3s-droplet`
3. Install full monitoring + Argo CD + Argo Workflows + ci-lane
4. Apply facebook-mock / staging; create `github-ci-read`; unsuspend poller
5. Prove staging CI Succeeded (`check-staging-ci-smoke.py`)

AC for bring-up: droplet + platform + staging-ci-smoke checks (delivery gate).
