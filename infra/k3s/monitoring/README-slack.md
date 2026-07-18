# Grafana Slack via bot token (k3s).

| Contact point / consumer | Env | Channel |
|--------------------------|-----|---------|
| Slack Grafana (default) | `SLACK_CHANNEL_ID_GRAFANA` | `#homie-alerts-grafana` |
| Argo CD / GitOps | `SLACK_ARGOCD_CHANNEL_ID` | `#homie-alerts-argocd` |
| Argo Workflows / CI | `SLACK_ARGO_WORKFLOWS_CHANNEL_ID` | `#homie-alerts-argo-workflows` |
| Runtime errors (production) | `SLACK_RUNTIME_ERRORS_CHANNEL_ID` | `#homie-runtime-errors` |
| Runtime errors (staging) | `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID` | `#homie-runtime-errors-staging` |
| New postings (production) | `SLACK_NEW_POSTINGS_CHANNEL_ID` | `#homie-new-postings` |
| New postings (staging) | `SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID` | `#homie-new-postings-staging` |
| Slack Temporal (deferred) | `SLACK_TEMPORAL_CHANNEL_ID` | `#homie-alerts-temporal` |

Lane secrets (`./scripts/apply-homie-slack-secret.sh staging|production`) write only that lane’s runtime-error + new-postings IDs into `homie-slack`. Staging never falls back to production channels.

**Provisioned Grafana rules (via `values-slack.yaml`):** `NodeMemoryLow` — free memory
`< 15%` for 5m (`node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes`) → Slack Grafana.

Archived: `#homie-alerts` (general). **Do not archive** `#homie-alerts-argocd`.

Grafana (this pack):

```bash
source ~/.zshrc
./scripts/apply-grafana-slack-secret.sh
cd infra/k3s/monitoring
./install.sh --wait --timeout 15m -f values.yaml -f values-slack.yaml
```

Argo CD OutOfSync / SyncFailed → `#homie-alerts-argocd` (separate Secret in `argocd` ns):

```bash
./scripts/apply-argocd-slack-secret.sh
cd infra/k3s/argocd && ./install.sh --wait --timeout 10m
```

Argo Workflows / CI → `#homie-alerts-argo-workflows` (`SLACK_ARGO_WORKFLOWS_CHANNEL_ID`; wire when CI onExit is ready).

See [`../argocd/README-slack.md`](../argocd/README-slack.md).
