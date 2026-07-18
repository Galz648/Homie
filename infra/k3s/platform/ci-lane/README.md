# Platform — CI lane (homie-ci)

Dedicated namespace for on-cluster Argo Workflows CI so runs do not mutate
`homie-staging` / `homie` app lanes.

## Decision (locked)

| Layer | Role | Triggers when |
|-------|------|----------------|
| **Argo Workflows (PRIMARY CI)** | Clone `staging` → drizzle migrate → `bun run test:e2e-mocks` | Tip SHA changes (poller); skip `chore(k3s): pin*` |
| **Argo CD (GitOps deploy)** | Sync overlay/Helm desired state | Any path drift vs live (manual Sync for now) — **not** tags-only |
| **Image build / pin** | Deferred until Homie has app images + Zot | — |
| **GHA `argo-ci.yml`** | Secondary / optional submit-wait | Only if `HOMIE_K3S_KUBECONFIG` set — never primary |

```text
GitHub staging tip
        ▲
        │  cluster pulls (git ls-remote / clone)
Argo Workflows  ──►  homie-ci-staging  (mock e2e gate)
        │
Argo CD         ──►  overlays/* / monitoring  (operator Sync)
```

**Policy:** no GitHub→cluster kubeconfig for CI submit.

## Intent

| Item | Plan |
|------|------|
| Namespace | `homie-ci` |
| Consumers | `homie-ci-smoke`, `homie-ci-staging`, future templates |
| Isolation | Do not apply CI Jobs into `homie-staging` app Deployments |
| Trigger | `homie-ci-staging-poll` CronJob — see `../argo-workflows/` |

## Apply

```bash
kubectl apply -k infra/k3s/platform/ci-lane/
kubectl -n argo apply -f infra/k3s/platform/argo-workflows/templates/
kubectl -n argo apply -f infra/k3s/platform/argo-workflows/examples/ci-staging-poll-rbac.yaml
kubectl -n argo apply -f infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml
```
