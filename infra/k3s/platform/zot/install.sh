#!/usr/bin/env bash
# Install / upgrade Zot into namespace `zot`.
#
# Usage:
#   ./install.sh
#   ./install.sh --wait --timeout 10m
#   KUBE_CONTEXT=k3d-homie-local ./install.sh --wait
#   NS=zot RELEASE=homie-zot ./install.sh --dry-run

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS="${NS:-zot}"
RELEASE="${RELEASE:-homie-zot}"
VALUES="${VALUES:-$ROOT/values.yaml}"
CHART_REPO_NAME="${CHART_REPO_NAME:-project-zot}"
CHART_REPO_URL="${CHART_REPO_URL:-https://zotregistry.dev/helm-charts}"
CHART="${CHART:-zot}"
CHART_VERSION="${CHART_VERSION:-0.1.122}"
KUBE_CONTEXT="${KUBE_CONTEXT:-}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: required command not found: $1" >&2
    exit 1
  }
}

need helm
need kubectl

HELM_CTX=()
KUBECTL_CTX=()
if [[ -n "${KUBE_CONTEXT}" ]]; then
  HELM_CTX=(--kube-context "${KUBE_CONTEXT}")
  KUBECTL_CTX=(--context "${KUBE_CONTEXT}")
fi

echo "==> helm repos"
helm repo add "${CHART_REPO_NAME}" "${CHART_REPO_URL}" 2>/dev/null || true
helm repo update "${CHART_REPO_NAME}"

echo "==> namespace ${NS}"
kubectl "${KUBECTL_CTX[@]}" create namespace "${NS}" --dry-run=client -o yaml | kubectl "${KUBECTL_CTX[@]}" apply -f -

echo "==> helm upgrade --install ${RELEASE} ${CHART_REPO_NAME}/${CHART} -n ${NS}"
helm upgrade --install "${RELEASE}" "${CHART_REPO_NAME}/${CHART}" \
  "${HELM_CTX[@]}" \
  --namespace "${NS}" \
  --version "${CHART_VERSION}" \
  --values "${VALUES}" \
  "$@"

echo "==> done"
echo "    release:  ${RELEASE}"
echo "    namespace: ${NS}"
echo "    pods:     kubectl ${KUBECTL_CTX[*]} get pods -n ${NS}"
echo "    api:      kubectl ${KUBECTL_CTX[*]} -n ${NS} port-forward svc/${RELEASE} 5000:5000"
echo "              then curl -sS http://127.0.0.1:5000/v2/"
