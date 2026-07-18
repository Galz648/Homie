# Clinic pack adaptation notes (read-only pointers)

Adapt (do not symlink) from the clinic worktree. Homie-rename all releases.

| Homie path | Clinic source (outside this repo) |
|------------|-----------------------------------|
| `infra/k3s/monitoring/` | `clinic-reminder-system-mb-k3s/deploy/k3s/monitoring/` |
| `infra/k3s/argocd/` | `…/deploy/k3s/argocd/` |
| `infra/k3s/platform/argo-workflows/` | `…/deploy/k3s/platform/argo-workflows/` |
| `infra/terraform/stacks/k3s/` | `…/terraform/stacks/k3s/` (Homie droplet name; generic data volumes, not WAHA) |
| `infra/k3s/platform/ci-lane/` | `…/deploy/k3s/platform/ci-lane/` → ns `homie-ci` |
| `.github/workflows/argo-ci.yml` | `…/.github/workflows/argo-ci.yml` (Homie paths + k3d context) |
| WorkflowTemplate stubs | Adapt shape of `templates/clinic-ci-*.yaml` → `homie-ci-smoke` only |

Local k3d operator pattern: clinic `docs/k3s-local-dev.md` (Docker ≥ ~8 GiB, helm, kubectl).

Strip: clinic-api, WAHA, Temporal, Clinica mocks, clinic Slack channel names → Homie placeholders (`#homie-alerts-*`).

Repo for Argo Applications: `https://github.com/Galz648/Homie.git`  
Paths: `infra/k3s/overlays/{staging,production}` and optionally monitoring Helm path.
