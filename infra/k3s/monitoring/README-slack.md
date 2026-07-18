# Grafana Slack via bot token (k3s).

| Contact point / consumer | Env | Channel |
|--------------------------|-----|---------|
| Slack Grafana (default) | `SLACK_CHANNEL_ID_GRAFANA` | `#homie-alerts-grafana` |
| Argo CD / GitOps | `SLACK_ARGOCD_CHANNEL_ID` | `#homie-alerts-argocd` |
| Argo Workflows / CI | `SLACK_ARGO_WORKFLOWS_CHANNEL_ID` | `#homie-alerts-argo-workflows` |
| Staging tip poller | `SLACK_CI_POLL_CHANNEL_ID` | `#homie-alerts-ci-poll` |
| Runtime errors (production) | `SLACK_RUNTIME_ERRORS_CHANNEL_ID` | `#homie-runtime-errors` |
| Runtime errors (staging) | `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID` | `#homie-runtime-errors-staging` |
| Raw postings — scrape (production) | `SLACK_RAW_POSTINGS_CHANNEL_ID` | `#homie-raw-postings` (`C0BJB6QHUPK`) |
| Raw postings — scrape (staging) | `SLACK_STAGING_RAW_POSTINGS_CHANNEL_ID` | `#homie-raw-postings-staging` (`C0BJ60HRSF7`) |
| Listings ingest (production) | `SLACK_INGEST_LISTINGS_CHANNEL_ID` | `#homie-listings-ingest` (`C0BJ60HS2GM`) |
| Listings ingest (staging) | `SLACK_STAGING_INGEST_LISTINGS_CHANNEL_ID` | `#homie-listings-ingest-staging` (`C0BJ79767B8`) |
| Slack Temporal (deferred) | `SLACK_TEMPORAL_CHANNEL_ID` | `#homie-alerts-temporal` |

Lane secrets (`./scripts/apply-homie-slack-secret.sh staging|production`) write only that lane's runtime-error + raw-postings + ingest-listings IDs into `homie-slack`. Staging never falls back to production channels.

`fb-scrape-worker` (Temporal scrape activities) posts to the **raw** channel — one message per new Facebook post, before extraction. `homie-ingest` posts to the **ingest** channel — one message per listing upserted into `apartment_listings`, with the Facebook post link + image links. These are deliberately separate channels so raw scrape volume doesn't drown out validated listing writes.

The old `SLACK_*_NEW_POSTINGS_CHANNEL_ID` names are still read as a fallback for the raw-postings channel during the migration window — prefer setting the new `SLACK_*_RAW_POSTINGS_CHANNEL_ID` names going forward; `apply-homie-slack-secret.sh` now requires them.

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

Staging tip poller (`homie-ci-staging-poll`) → `#homie-alerts-ci-poll` on tip change
(submit CI or skip pin). Secret out-of-band:

```bash
KUBECONFIG=~/.kube/homie-k3s-admin.yaml ./scripts/apply-homie-ci-poll-slack-secret.sh
KUBECONFIG=~/.kube/homie-k3s-admin.yaml kubectl -n argo apply -f \
  infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml
```

See [`../argocd/README-slack.md`](../argocd/README-slack.md).
