# Platform — Argo Workflows (Phase 3)

In-cluster workflow engine — **primary CI** on the droplet (clinic **pull** model).
**Argo CD stays the deploy sync path** (any overlay drift; not image-tags-only).

| Item | Default |
|------|---------|
| Namespace | `argo` |
| Helm release | `homie-argo-workflows` |
| Chart | `argo/argo-workflows` **1.0.19** (app v4.0.7) |
| Server | ClusterIP **2746** (port-forward only) |
| Smoke | `examples/hello-smoke.yaml` |
| Staging CI | `templates/homie-ci-staging.yaml` + poll CronJob |

## CI model (pull)

```text
GitHub branch staging
        ▲
        │  cluster polls tip (~1m) / clones git
        │
Argo Workflows ON droplet (PRIMARY)
        │  CronJob homie-ci-staging-poll
        ▼
WorkflowTemplate homie-ci-staging
  (ephemeral Postgres + facebook-mock → bun test:e2e-mocks)
```

**Policy:** no GitHub→cluster kubeconfig for CI submit. Cluster reaches GitHub;
not the reverse. Thin GHA remains secondary only.

| Trigger | Artifact |
|---------|----------|
| Staging tip poll (1m) | `examples/ci-staging-poll-{rbac,cronjob}.yaml` (`alpine/k8s` + `git ls-remote`) |
| Pin-only tip | Skipped (`chore(k3s): pin*`) — ready for a future build/pin loop |
| Manual / smoke | `kubectl -n argo create` from `homie-ci-staging` / `homie-ci-smoke` |

Image build → Zot → overlay pin is **deferred** until Homie ships app container images.

## Install

```bash
cd infra/k3s/platform/argo-workflows
chmod +x install.sh
./install.sh --wait --timeout 10m
# droplet: KUBE_CONTEXT=homie-k3s-droplet ./install.sh --wait --timeout 15m
```

## Access (port-forward)

```bash
kubectl -n argo port-forward svc/homie-argo-workflows-server 2746:2746
# UI: http://127.0.0.1:2746  (authModes: server — open for PoC; tighten before exposure)
```

## WorkflowTemplates

| Template | Purpose |
|----------|---------|
| `homie-ci-smoke` | Minimal echo smoke |
| `homie-ci-staging` | Clone staging → drizzle migrate → assert `scrape_cursors` / `raw_facebook_posts` → facebook mock e2e |
| `homie-build-images` | Kaniko → Zot `homie/fb-scrape-worker:staging-<sha>` |

```bash
kubectl -n argo apply -f templates/homie-ci-staging.yaml
kubectl -n argo apply -f templates/homie-build-images.yaml
kubectl -n argo apply -f examples/ci-staging-poll-rbac.yaml
kubectl -n argo apply -f examples/ci-staging-poll-cronjob.yaml
# Manual build: kubectl -n argo create -f examples/ci-build-images.yaml
```

Image build → Zot is live; pin overlay `newTag` from the operator (or add `github-ci-ssh` later for in-cluster pin). Poller skips `chore(k3s): pin*`.
