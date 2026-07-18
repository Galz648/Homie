# Monitoring Helm pack (local k3s)

Local-dev sized **Prometheus + Grafana + Loki + Alloy** stack for Homie
k3s workload pack. Alloy runs as a **DaemonSet** and ships container logs to
Loki via the Kubernetes API (`loki.source.kubernetes`).

| Item | Default |
|------|---------|
| Namespace | `monitoring` |
| Helm release | `homie-monitoring` |
| Values | [`values.yaml`](./values.yaml) |
| Retention | Prometheus `6h` / Loki `24h` |

No secrets are committed. Set `GRAFANA_ADMIN_PASSWORD` when installing if you
want a known Grafana admin password.

**Slack (P5):** see [`README-slack.md`](./README-slack.md) — wire before treating
the droplet as the managed real-staging home. Alertmanager stays off; Grafana
unified alerting + webhook Secret.

## Lite vs full

| Capability | Lite (`lite-manifests.yaml` / `install-lite.sh`) | Full (`install.sh` + umbrella chart) |
|------------|--------------------------------------------------|--------------------------------------|
| Container logs → Loki | yes | yes |
| Grafana Explore (logs) | yes | yes |
| Prometheus metrics TSDB | no | yes |
| kube-state-metrics (deployments, pods, …) | no | yes |
| Node exporter (CPU/mem/disk on the node) | no | yes |
| Default Kubernetes recording/alert rules | no | yes (Alertmanager off locally) |
| Prometheus Operator + ServiceMonitor CRDs | no | yes (scrape app metrics later) |
| Typical RAM on top of Homie stack | ~0.5–1 GiB | ~1.5–2.5 GiB |

**Use lite** when Docker Desktop is tight (~4 GiB) or you only need log grepping.
**Use full** for day-to-day k3s parity with “real” observability: metrics + logs in one Grafana.

## Quick install (umbrella chart)

```bash
cd infra/k3s/monitoring
chmod +x install.sh
./install.sh --wait --timeout 10m
```

`install.sh` will:

1. `helm repo add` prometheus-community + grafana
2. Create namespace `monitoring` (idempotent)
3. `helm dependency build` (pulls kube-prometheus-stack, loki, alloy)
4. `helm upgrade --install homie-monitoring . -n monitoring -f values.yaml`

Extra argv are forwarded to `helm upgrade --install`:

```bash
./install.sh --dry-run
NS=monitoring RELEASE=homie-monitoring ./install.sh --wait
GRAFANA_ADMIN_PASSWORD='local-only' ./install.sh --wait
```

## Equivalent standalone installs

Same stack as three releases (useful if you prefer not to use the umbrella).
Values keys in `values.yaml` map 1:1 to each chart — extract the relevant
top-level block (`kube-prometheus-stack`, `loki`, `alloy`) into a temp file
or pass with a values splitter.

### 1. kube-prometheus-stack (Prometheus + Grafana)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install homie-monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --version 69.8.2 \
  --values <(yq '.["kube-prometheus-stack"]' values.yaml) \
  --wait
```

### 2. grafana/loki (single-binary)

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade --install homie-loki grafana/loki \
  --namespace monitoring \
  --version 6.27.0 \
  --values <(yq '.loki' values.yaml) \
  --wait
```

If you install Loki under release name `homie-loki`, update Alloy’s
`loki.write` URL and Grafana’s Loki datasource URL to
`http://homie-loki-gateway.monitoring.svc.cluster.local:80`.

### 3. grafana/alloy (DaemonSet → Loki)

```bash
helm upgrade --install homie-alloy grafana/alloy \
  --namespace monitoring \
  --version 0.12.5 \
  --values <(yq '.alloy' values.yaml) \
  --wait
```

Alternative agent charts: `grafana/k8s-monitoring` (full opinionated stack) or
Promtail (`grafana/promtail`) if you prefer file-tail over Alloy API scrape.
This pack standardizes on **Alloy**.

## Verify

```bash
kubectl get pods -n monitoring
helm status homie-monitoring -n monitoring

# Grafana UI
kubectl -n monitoring port-forward svc/homie-monitoring-grafana 3000:80
# open http://localhost:3000 — Explore → Loki / Prometheus
```

Checker used by the migration loop:

```bash
python3 looper-migration-to-local-k3s/scripts/check-monitoring-up.py
```

Expects release `homie-monitoring` in ns `monitoring`, plus pods matching
`loki`, `grafana`, `prometheus`, and a log agent (`alloy`).

## Layout

```text
infra/k3s/monitoring/
  Chart.yaml      # umbrella deps: kube-prometheus-stack, loki, alloy
  values.yaml     # local-dev sized values (short retention, small resources)
  install.sh      # repo add + ns + helm upgrade
  README.md
```

## Notes

- Sized for **local k3s**, not production: short retention, no Alertmanager,
  disabled kube-etcd / controller-manager / scheduler scrapes.
- Alloy discovers pods on its node (`spec.nodeName`) and pushes to
  `homie-monitoring-loki-gateway` in the same namespace.
- Do not commit Grafana admin passwords or other secrets into this directory.
