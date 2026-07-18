#!/usr/bin/env bash
# Install / upgrade the local-dev monitoring stack into namespace `monitoring`.
#
# Usage:
#   ./install.sh
#   ./install.sh --wait --timeout 10m
#   NS=monitoring RELEASE=homie-monitoring ./install.sh --dry-run
#
# Extra argv are forwarded to `helm upgrade --install`.
# Optional: GRAFANA_ADMIN_PASSWORD=... (never commit secrets)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS="${NS:-monitoring}"
RELEASE="${RELEASE:-homie-monitoring}"
VALUES="${VALUES:-$ROOT/values.yaml}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: required command not found: $1" >&2
    exit 1
  }
}

need helm
need kubectl

echo "==> helm repos"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
helm repo update prometheus-community grafana

echo "==> namespace ${NS}"
kubectl create namespace "${NS}" --dry-run=client -o yaml | kubectl apply -f -

echo "==> helm dependency build (${ROOT})"
helm dependency build "${ROOT}"

HELM_EXTRA=()
if [[ -n "${GRAFANA_ADMIN_PASSWORD:-}" ]]; then
  HELM_EXTRA+=(--set "kube-prometheus-stack.grafana.adminPassword=${GRAFANA_ADMIN_PASSWORD}")
fi

echo "==> helm upgrade --install ${RELEASE} -n ${NS}"
helm upgrade --install "${RELEASE}" "${ROOT}" \
  --namespace "${NS}" \
  --values "${VALUES}" \
  "${HELM_EXTRA[@]}" \
  "$@"

echo "==> done"
echo "    release:  ${RELEASE}"
echo "    namespace: ${NS}"
echo "    pods:     kubectl get pods -n ${NS}"
echo "    grafana:  kubectl -n ${NS} port-forward svc/${RELEASE}-grafana 3000:80"
echo "    loki:     kubectl -n ${NS} port-forward svc/${RELEASE}-loki-gateway 3100:80"
