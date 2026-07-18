# Grafana Slack via bot token (k3s).

| Contact point / consumer | Env | Channel |
|--------------------------|-----|---------|
| Slack Grafana (default) | `SLACK_CHANNEL_ID_GRAFANA` | `#homie-alerts-grafana` |
| Slack Temporal | `SLACK_TEMPORAL_CHANNEL_ID` | `#homie-alerts-temporal` |
| ArgoCD / GitOps | `SLACK_ARGOCD_CHANNEL_ID` | `#homie-alerts-argocd` |

**Provisioned Grafana rules (via `values-slack.yaml`):** `NodeMemoryLow` — free memory
`< 15%` for 5m (`node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes`) → Slack Grafana.

Archived: `#homie-alerts` (general). **Do not archive** `#homie-alerts-argocd`.

Grafana / Temporal (this pack):

```bash
source ~/.zshrc
./scripts/apply-grafana-slack-secret.sh
cd infra/k3s/monitoring
./install.sh --wait --timeout 15m -f values.yaml -f values-slack.yaml
```

Argo CD OutOfSync / SyncFailed (separate Secret in `argocd` ns):

```bash
./scripts/apply-argocd-slack-secret.sh
cd infra/k3s/argocd && ./install.sh --wait --timeout 10m
```

See [`../argocd/README-slack.md`](../argocd/README-slack.md).
