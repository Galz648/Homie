# Traefik (Homie k3s)

k3s is installed with `--disable traefik` (see Terraform cloud-init). This pack
installs Traefik via Helm so public HTTP(S) goes through a real ingress
controller — **not** ad-hoc NodePorts.

| Item | Value |
|------|--------|
| Namespace | `traefik` |
| Release | `homie-traefik` |
| IngressClass | `traefik` (default) |
| EntryPoints | `web` :80, `websecure` :443 |

## Install

```bash
KUBECONFIG=~/.kube/homie-k3s-admin.yaml ./install.sh --wait --timeout 10m
```

## Firewall

Terraform (`infra/terraform/stacks/k3s`) opens **tcp/80** and **tcp/443** on the
droplet for Cloudflare Agent → Homie ingest callbacks. Apply TF with operator
approval; do not rely on one-off NodePort rules (e.g. 31212).

## Staging ingest

`infra/k3s/overlays/staging/ingress-homie-ingest.yaml` routes `/` →
`homie-ingest:8080`. Agent secret must use a **hostname** (CF Workers reject
raw-IP fetch with error 1003):

```bash
# Prefer a real DNS A record later. Until then sslip.io works:
#   HOMIE_INGEST_URL=http://164.92.193.255.sslip.io
printf '%s' "$HOMIE_INGEST_URL" | npx wrangler secret put HOMIE_INGEST_URL
```
