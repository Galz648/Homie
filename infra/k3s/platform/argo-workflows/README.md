# Platform — Argo Workflows (Phase 3)

In-cluster workflow engine — **primary CI** on the droplet (clinic **pull** model).
**Argo CD stays the deploy sync path.**

| Item | Default |
|------|---------|
| Namespace | `argo` |
| Helm release | `homie-argo-workflows` |
| Chart | `argo/argo-workflows` **1.0.19** (app v4.0.7) |
| Server | ClusterIP **2746** (port-forward only) |
| Smoke | `examples/hello-smoke.yaml` |
| Staging CI | `templates/homie-ci-staging.yaml` + `examples/ci-staging-poll-cronjob.yaml` |

## CI model (pull)

```text
GitHub branch staging
        ▲
        │  cluster polls api.github.com (~1m) / clones git
        │
Argo Workflows ON droplet (PRIMARY)
        │  CronJob homie-ci-staging-poll
        ▼
WorkflowTemplate homie-ci-staging (+ facebook-mock)
```

**Policy:** no GitHub→cluster kubeconfig for CI submit. Cluster reaches GitHub;
not the reverse. Optional thin GHA remains secondary only — do **not** use a
repo kubeconfig secret as the main CI submit path.

| Trigger | Artifact |
|---------|----------|
| Staging tip poll (1m) | `examples/ci-staging-poll-{rbac,cronjob}.yaml` (`alpine/k8s` + `git ls-remote`, anon HTTPS) |
| Manual / smoke | `kubectl -n argo create` from `homie-ci-staging` template |

## Install

```bash
cd infra/k3s/platform/argo-workflows
chmod +x install.sh
./install.sh --wait --timeout 10m
# or: KUBE_CONTEXT=k3d-homie-local ./install.sh --wait
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
| `homie-ci-staging` | Clone staging → hit `facebook-mock` (staging CI) |

```bash
kubectl -n argo apply -f templates/homie-ci-staging.yaml
kubectl -n argo apply -f examples/ci-staging-poll-rbac.yaml
kubectl -n argo apply -f examples/ci-staging-poll-cronjob.yaml
```

## Smoke

```bash
kubectl -n argo create -f examples/hello-smoke.yaml
kubectl -n argo get workflows
```

## Notes

- Do not enable Ingress/LoadBalancer without auth.
- Do not replace Argo CD with Workflows.
- Staging CI needs `facebook-mock` in `homie-staging` (see `infra/k3s/base/facebook-mock`).
