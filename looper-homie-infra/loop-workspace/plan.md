# Plan — homie-local-k3s-infra

## Package: spec-docs

- id: spec-docs
- deps: none
- parallel_group: A
- worktree: main-tree
- ac_command: python3 looper-homie-infra/scripts/check-spec-sections.py

Write `infra/SPEC.md` + `infra/README.md`.

## Package: tree-stubs

- id: tree-stubs
- deps: spec-docs
- parallel_group: B
- worktree: main-tree
- ac_command: python3 looper-homie-infra/scripts/check-tree-present.py

Scaffold TF stub, base README, overlays `{local,staging,production}`, `scripts/k3s-local-up.sh`.

## Package: monitoring

- id: monitoring
- deps: tree-stubs
- parallel_group: C
- worktree: main-tree
- ac_command: test -x infra/k3s/monitoring/install.sh && grep -q homie-monitoring infra/k3s/monitoring/install.sh

Homie-named monitoring Helm pack (+ Slack docs).

## Package: argocd

- id: argocd
- deps: tree-stubs
- parallel_group: C
- worktree: main-tree
- ac_command: test -x infra/k3s/argocd/install.sh && grep -q homie-argocd infra/k3s/argocd/install.sh

Homie-named Argo CD + Application stubs → `infra/k3s/overlays/*`.

## Package: argo-workflows

- id: argo-workflows
- deps: tree-stubs
- parallel_group: C
- worktree: main-tree
- ac_command: test -x infra/k3s/platform/argo-workflows/install.sh

Homie-named Argo Workflows + hello smoke.

## Package: ci-plumbing

- id: ci-plumbing
- deps: argo-workflows
- parallel_group: D
- worktree: main-tree
- ac_command: python3 looper-homie-infra/scripts/check-ci-plumbing.py

`platform/ci-lane`, `homie-ci-smoke` template, `.github/workflows/argo-ci.yml`.

## Package: local-install-verify

- id: local-install-verify
- deps: monitoring, argocd, argo-workflows, ci-plumbing
- parallel_group: E
- worktree: main-tree
- ac_command: python3 looper-homie-infra/scripts/check-k3s-ready.py && python3 looper-homie-infra/scripts/check-platform-up.py

Bring up k3d, run three `install.sh`, confirm Ready pods. Requires operator approval for Docker/k3d/helm.
