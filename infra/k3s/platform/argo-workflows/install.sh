#!/usr/bin/env bash
# Install / upgrade Argo Workflows into namespace `argo`.
#
# Usage:
#   ./install.sh
#   ./install.sh --wait --timeout 10m
#   KUBE_CONTEXT=k3d-homie-local ./install.sh --wait
#   KUBE_CONTEXT=homie-k3s-droplet ./install.sh --wait --timeout 15m
#   NS=argo RELEASE=homie-argo-workflows ./install.sh --dry-run

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS="${NS:-argo}"
RELEASE="${RELEASE:-homie-argo-workflows}"
VALUES="${VALUES:-$ROOT/values.yaml}"
CHART_REPO_NAME="${CHART_REPO_NAME:-argo}"
CHART_REPO_URL="${CHART_REPO_URL:-https://argoproj.github.io/argo-helm}"
CHART="${CHART:-argo-workflows}"
CHART_VERSION="${CHART_VERSION:-1.0.19}"
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
echo "    UI:       kubectl ${KUBECTL_CTX[*]} -n ${NS} port-forward svc/${RELEASE}-server 2746:2746"
echo "              then open http://127.0.0.1:2746"
echo "    smoke:    kubectl ${KUBECTL_CTX[*]} -n ${NS} apply -f ${ROOT}/examples/hello-smoke.yaml"
