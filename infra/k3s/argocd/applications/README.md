# Argo CD Applications

Apply **after** `../install.sh` and CRDs are present:

```bash
kubectl get crd applications.argoproj.io
kubectl apply -f .
```

| File | Syncs |
|------|--------|
| `homie-workloads.yaml` | Kustomize `infra/k3s/overlays/staging` → ns `homie-staging` |
| `homie-workloads-production.yaml` | Kustomize `infra/k3s/overlays/production` → ns `homie-production` (**do not apply** until capacity — see readiness doc) |
| `homie-monitoring.yaml` | Helm `infra/k3s/monitoring` (`values.yaml` + `values-slack.yaml`) → ns `monitoring` |
| `repo-homie.yaml` | Git repo registration (public) |

Defaults: `targetRevision: **staging**`, **manual** sync.

Production Application YAML is in-repo for when the droplet can host a second lane; creating it in the cluster starts syncing workloads — wait for capacity first.

Slack (Grafana): `values-slack.yaml` is listed on the monitoring Application. The Secret
`monitoring/grafana-slack` stays out-of-band (`scripts/apply-grafana-slack-secret.sh`).

Slack (Argo OutOfSync/SyncFailed): configured in `../values.yaml` notifications;
Secret `argocd/argocd-notifications-secret` via `scripts/apply-argocd-slack-secret.sh`
(see `../README-slack.md`).
