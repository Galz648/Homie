# Argo CD Helm pack (Homie k3s)

GitOps controller for managed (and optional local) k3s. Same install pattern as
[`../monitoring`](../monitoring): umbrella Helm chart + `install.sh`.

| Item | Default |
|------|---------|
| Namespace | `argocd` |
| Helm release | `homie-argocd` |
| Chart | `argo/argo-cd` **10.1.3** (via umbrella) |
| Values | [`values.yaml`](./values.yaml) |
| Access | ClusterIP + `kubectl port-forward` (Tailscale to droplet) |

Locked decision: **Argo CD** (not Flux). See `looper-k3s-gitops/`.

## Quick install

```bash
cd infra/k3s/argocd
chmod +x install.sh
./install.sh --wait --timeout 10m
```

`install.sh` will:

1. `helm repo add` argo
2. Create namespace `argocd` (idempotent)
3. `helm dependency build`
4. `helm upgrade --install homie-argocd . -n argocd -f values.yaml`

## UI / admin

Password is **not** in git. Look it up here:

| Where | Path |
|-------|------|
| Local secrets (preferred) | `~/.config/homie/argocd-admin.env` (`ARGOCD_PASSWORD`) |
| Live cluster Secret | `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' \| base64 -d; echo` |

```bash
source ~/.config/homie/argocd-admin.env
kubectl -n argocd port-forward svc/homie-argocd-server 8080:80
# open http://localhost:8080 — user admin / $ARGOCD_PASSWORD
```

## Applications (after controller is Ready)

Stubs under [`applications/`](./applications/) sync the workload pack and
monitoring chart from git. **Manual sync by default** (no auto-prune) until
operator signoff.

```bash
# Wait for CRDs
kubectl get crd applications.argoproj.io

# Edit repoURL / targetRevision / path if needed, then:
kubectl apply -f applications/
```

Private-repo credentials (if the GitHub repo is not public to the cluster):

```bash
# example — do not commit the token
kubectl -n argocd create secret generic repo-homie \
  --from-literal=type=git \
  --from-literal=url=https://github.com/Galz648/Homie.git \
  --from-literal=password="$GITHUB_TOKEN" \
  --from-literal=username=git
kubectl -n argocd label secret repo-homie argocd.argoproj.io/secret-type=repository
```

## Verify

```bash
kubectl get pods -n argocd
helm status homie-argocd -n argocd
python3 looper-k3s-gitops/scripts/check-gitops-healthy.py   # after Applications exist
```

## Layout

```text
infra/k3s/argocd/
  Chart.yaml
  values.yaml            # notifications → Slack enabled here
  install.sh
  README.md
  README-slack.md        # OutOfSync / SyncFailed operator steps
  applications/          # Application CRs (apply after install)
    homie-workloads.yaml
    homie-monitoring.yaml
```

## Slack notifications (OutOfSync / SyncFailed)

See [`README-slack.md`](./README-slack.md). Secret out-of-band (from repo root):

```bash
./scripts/apply-argocd-slack-secret.sh
cd infra/k3s/argocd && ./install.sh --wait --timeout 10m
```

## Notes

- No ingress / cert-manager yet — Tailscale + port-forward only.
- `server.insecure=true` is intentional for that access model; revisit when TLS
  ingress exists.
- Dex/SSO and ApplicationSet are off to keep the single-node footprint small.
- Notifications controller is on (Slack → `#homie-alerts-argocd`); auto-sync stays off.
- Do not commit admin passwords, Slack tokens, or repo tokens into this directory.
- Terraform still owns the droplet only (`infra/terraform/stacks/k3s`); Argo owns
  workload sync from git.
