# Argo CD → Slack (OutOfSync / SyncFailed)

| | |
|--|--|
| Channel | `#homie-alerts-argocd` |
| Env (local) | `SLACK_BOT_TOKEN`, `SLACK_ARGOCD_CHANNEL_ID` in `~/.config/homie/slack.env` |
| Secret | `argocd/argocd-notifications-secret` key `slack-token` (out-of-band) |
| Config | [`values.yaml`](./values.yaml) `notifications.*` |

Triggers (global subscription — all Applications in the `argocd` ns):

- **OutOfSync** — desired git ≠ live (`on-sync-status-outofsync`, once per revision)
- **SyncFailed** — sync operation phase `Error` / `Failed` (`on-sync-failed`)

Does **not** auto-enable `syncPolicy.automated`. Manual sync stays the default.

## Apply

```bash
source ~/.zshrc   # or source ~/.config/homie/slack.env
./scripts/apply-argocd-slack-secret.sh
cd infra/k3s/argocd
./install.sh --wait --timeout 10m
# Ensure bot is in #homie-alerts-argocd (Slack → channel → Integrations → Add apps)
kubectl -n argocd get deploy,pods -l app.kubernetes.io/name=argocd-notifications-controller
kubectl -n argocd get cm argocd-notifications-cm -o yaml | grep -E 'trigger\.|service\.slack|homie-alerts'
```

## Prove Slack fires

1. Make a tiny manifest drift under a tracked path (e.g. add a ConfigMap annotation in `infra/k3s/overlays/staging`) and push to the Application `targetRevision` branch (`staging`).
2. Wait for reconcile (`timeout.reconciliation` ≈ 180s) — Application should show **OutOfSync**.
3. Expect a message in `#homie-alerts-argocd`.
4. Sync the app (UI or `argocd app sync homie-workloads`) to clear drift.

Or force a failed sync (broken image / invalid manifest) to exercise **SyncFailed**.
