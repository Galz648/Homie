# Platform — Argo Workflows (Phase 3)

In-cluster workflow engine — **primary CI** on the droplet. **Argo CD stays the deploy sync path.**  
GitHub Actions is **secondary/transitional** until `HOMIE_K3S_KUBECONFIG` is set and branch protection requires **Argo CI**.

| Item | Default |
|------|---------|
| Namespace | `argo` |
| Helm release | `homie-argo-workflows` |
| Chart | `argo/argo-workflows` **1.0.19** (app v4.0.7) |
| Server | ClusterIP **2746** (port-forward only) |
| Smoke | `examples/hello-smoke.yaml` |

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

Reusable CI templates live under `templates/`:

| Template | Purpose |
|----------|---------|
| `homie-ci-unit-slice` | Clone staging → light unit + `config:sync --check` |
| `homie-ci-e2e-precommit` | Clone staging → `test:e2e:precommit` via staging mock Services |

```bash
kubectl -n argo apply -f templates/
kubectl -n argo create -f examples/from-template-ci-unit.yaml
kubectl -n argo create -f examples/from-template-ci-e2e.yaml
```

## Smoke

```bash
kubectl -n argo create -f examples/hello-smoke.yaml
kubectl -n argo get workflows
```

## Acceptance / light CI (droplet)

```bash
# RBAC once
kubectl apply -f examples/platform-acceptance-rbac.yaml

# Platform probes: Zot, Infisical, ESO ClusterSecretStore + demo ExternalSecret, Argo controller
kubectl -n argo create -f examples/platform-acceptance.yaml

# Real repo CI slice: clone staging → bun install → unit tests + config:sync --check
kubectl -n argo create -f examples/ci-unit-slice.yaml
kubectl -n argo get workflows
```

Proven on `homie-k3s-droplet`: platform-acceptance Succeeded; ci-unit-slice + `config:sync --check OK`.

## PR gate (thin GHA → WorkflowTemplates)

```bash
# Local / operator
./scripts/ci/argo-wf-submit-wait.sh infra/k3s/platform/argo-workflows/examples/from-template-ci-unit.yaml
```

GitHub Actions workflow: `.github/workflows/argo-ci.yml`

1. Add repository secret `HOMIE_K3S_KUBECONFIG` (kubeconfig YAML or base64) for `homie-k3s-droplet`
2. Optional: mark **Argo CI / Submit Argo Workflow** required on `staging`
3. Until the secret exists, PR runs skip this job; use **Actions → Argo CI → Run workflow**

Argo CD stays deploy sync — it does not run these tests.

## Notes

- Do not enable Ingress/LoadBalancer without auth.
- Do not replace Argo CD with Workflows.
- `ci-unit-slice` needs ~1–2.5Gi temporary memory + 4Gi PVC; avoid running while the node is memory-tight.
