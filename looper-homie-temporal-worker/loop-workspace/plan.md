# Plan — Temporal worker on Homie k3s

Operator checkpoint: user said **run the loop** after approving goal/subgoals → treat **plan-approved**.

## Packages

## pkg-temporal-staging
- id: pkg-temporal-staging
- deps: []
- parallel_group: sequential
- worktree: none
- branch: infra
- write_paths:
  - infra/k3s/overlays/staging/kustomization.yaml
  - infra/k3s/overlays/staging/patch-temporal-svc-clusterip.yaml
  - infra/k3s/overlays/staging/patch-temporal-ui-svc-clusterip.yaml
  - infra/k3s/base/scrape-temporal/README.md
- ac_command: python3 looper-homie-temporal-worker/scripts/check-staging-worker-yaml.py
- notes: Add scrape-temporal to staging; ClusterIP Services (droplet, not k3d LB).

## pkg-worker-yaml
- id: pkg-worker-yaml
- deps: [pkg-temporal-staging]
- parallel_group: sequential
- worktree: none
- branch: infra
- write_paths:
  - infra/k3s/base/fb-scrape-worker/
  - infra/k3s/overlays/staging/kustomization.yaml
  - infra/k3s/overlays/staging/secrets.example.yaml
- ac_command: python3 looper-homie-temporal-worker/scripts/check-staging-worker-yaml.py
- notes: Deployment + ConfigMap; envFrom database/spaces secrets (examples only).

## pkg-image-stub
- id: pkg-image-stub
- deps: [pkg-worker-yaml]
- parallel_group: sequential
- worktree: none
- branch: infra
- write_paths:
  - infra/k3s/docker/Dockerfile.fb-scrape-worker
  - infra/k3s/overlays/staging/kustomization.yaml
- ac_command: test -f infra/k3s/docker/Dockerfile.fb-scrape-worker
- notes: Node+tsx Dockerfile; overlay images: newName/newTag stub for future pin.

## pkg-change-map
- id: pkg-change-map
- deps: [pkg-image-stub]
- parallel_group: sequential
- worktree: none
- branch: infra
- write_paths:
  - looper-homie-temporal-worker/loop-workspace/CHANGE-MAP.md
  - infra/k3s/base/fb-scrape-worker/README.md
- ac_command: python3 looper-homie-temporal-worker/scripts/check-change-map.py looper-homie-temporal-worker/loop-workspace/CHANGE-MAP.md

## Non-goals this loop
- Zot install / Kaniko WorkflowTemplate / live pin commits
- Applying Secrets or Syncing Argo on droplet
- Playwright browser image hardening / session Secret
- Production overlay worker (document only)
