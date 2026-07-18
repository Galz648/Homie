#!/usr/bin/env bash
# Lightweight local monitoring (avoids kube-prometheus-stack CRD blast on small k3d).
# Installs: Loki + Alloy (DaemonSet logs) + Grafana.
set -euo pipefail

NS="${NS:-monitoring}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
helm repo update grafana

kubectl create namespace "${NS}" --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install homie-loki grafana/loki \
  --namespace "${NS}" \
  --version 6.27.0 \
  --set loki.auth_enabled=false \
  --set loki.commonConfig.replication_factor=1 \
  --set singleBinary.replicas=1 \
  --set singleBinary.persistence.enabled=false \
  --set read.replicas=0 \
  --set write.replicas=0 \
  --set backend.replicas=0 \
  --set gateway.enabled=true \
  --set test.enabled=false \
  --set monitoring.selfMonitoring.enabled=false \
  --set monitoring.lokiCanary.enabled=false \
  --timeout 15m

helm upgrade --install homie-alloy grafana/alloy \
  --namespace "${NS}" \
  --version 0.12.5 \
  --set controller.type=daemonset \
  --set alloy.configMap.create=true \
  --set-file alloy.configMap.content="${ROOT}/alloy-local.river" \
  --timeout 10m

helm upgrade --install homie-grafana grafana/grafana \
  --namespace "${NS}" \
  --set adminPassword="${GRAFANA_ADMIN_PASSWORD:-admin}" \
  --set persistence.enabled=false \
  --set datasources."datasources\\.yaml".apiVersion=1 \
  --set datasources."datasources\\.yaml".datasources[0].name=Loki \
  --set datasources."datasources\\.yaml".datasources[0].type=loki \
  --set datasources."datasources\\.yaml".datasources[0].url=http://homie-loki-gateway:80 \
  --set datasources."datasources\\.yaml".datasources[0].access=proxy \
  --timeout 10m

echo "done: lightweight monitoring in ns=${NS}"
kubectl get pods -n "${NS}"
