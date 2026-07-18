# Platform — CI lane (homie-ci)

Dedicated namespace for on-cluster Argo Workflows CI so runs do not mutate
`homie-staging` / `homie` app lanes.

**Status:** scaffold only — add job runners / data plane when Homie has
containerized CI jobs (e.g. future scrapers).

## Intent

| Item | Plan |
|------|------|
| Namespace | `homie-ci` |
| Consumers | `WorkflowTemplate/homie-ci-smoke` and future Homie CI templates |
| Isolation | Do not apply CI Jobs into `homie-staging` |

## Non-goals

- Replacing Argo CD
- Public Ingress for Workflows UI
- Running Homie-Website product tests before suites exist

## Apply

```bash
kubectl apply -k infra/k3s/platform/ci-lane/
```
