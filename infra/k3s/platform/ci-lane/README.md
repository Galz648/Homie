# Platform — CI lane (homie-ci)

Dedicated namespace for on-cluster Argo Workflows CI so runs do not mutate
`homie-staging` / `homie` app lanes.

**Primary CI** is Argo Workflows on the droplet with a **pull** trigger
(`homie-ci-staging-poll` CronJob on GitHub `staging`). See
`../argo-workflows/README.md`.

## Intent

| Item | Plan |
|------|------|
| Namespace | `homie-ci` |
| Consumers | `homie-ci-smoke`, `homie-ci-staging`, future Homie CI templates |
| Isolation | Do not apply CI Jobs into `homie-staging` app Deployments |
| Trigger | Cluster polls GitHub — not GHA→kubectl |

## Non-goals

- Replacing Argo CD
- Public Ingress for Workflows UI
- `HOMIE_K3S_KUBECONFIG` as primary CI submit path

## Apply

```bash
kubectl apply -k infra/k3s/platform/ci-lane/
```
