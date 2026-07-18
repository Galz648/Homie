# Clinic CI pull model (read-only notes)

Source: `~/dev/clinic-reminder-system` branch `feature/k3s-ci-poll-1m` (and staging merges).

## Policy

```text
GitHub (git + API)
        ▲
        │  cluster pulls
        │
Argo Workflows ON droplet (PRIMARY)
        │  CronJob every 1m polls staging tip SHA
        │  on change → WorkflowTemplate
        ▼
CI with in-cluster mocks
```

**No GitHub→cluster kubeconfig.** Cluster reaches `api.github.com`; not the reverse for CI submit.

## Key artifacts

| Clinic | Homie target |
|--------|----------------|
| `examples/ci-staging-poll-cronjob.yaml` | `infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml` |
| `templates/clinic-ci-precommit-cluster.yaml` | `templates/homie-ci-staging.yaml` |
| `base/waha-mock`, `base/clinica-mock` | `base/facebook-mock` |
| Secret `argo/github-ci-read` | same pattern, Homie PAT |
| ConfigMap `clinic-ci-last-sha` | `homie-ci-last-sha` |

## Poller behavior

- Schedule: `* * * * *`, `concurrencyPolicy: Forbid`, often `suspend: true` until PAT exists
- GET `/repos/<owner>/<repo>/commits/staging` → compare SHA to ConfigMap → submit Workflow
