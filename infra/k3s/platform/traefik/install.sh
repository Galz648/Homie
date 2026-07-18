#!/usr/bin/env bash
# Install / upgrade Traefik into namespace `traefik`.
#
# Usage:
#   ./install.sh
#   ./install.sh --wait --timeout 10m
#   KUBE_CONTEXT=homie-k3s-droplet ./install.sh --wait --timeout 10m
#   NS=traefik RELEASE=homie-traefik ./install.sh --dry-run
#
# Requires break-glass admin kubeconfig. Open DO firewall 80/443 via Terraform
# (infra/terraform/stacks/k3s) before expecting public Agent callbacks.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS="${NS:-traefik}"
RELEASE="${RELEASE:-homie-traefik}"
VALUES="${VALUES:-$ROOT/values.yaml}"
CHART_REPO_NAME="${CHART_REPO_NAME:-traefik}"
CHART_REPO_URL="${CHART_REPO_URL:-https://traefik.github.io/charts}"
CHART="${CHART:-traefik}"
# Pin — bump deliberately.
CHART_VERSION="${CHART_VERSION:-37.1.0}"
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
kubectl "${KUBECTL_CTX[@]}" create namespace "${NS}" --dry-run=client -o yaml \
  | kubectl "${KUBECTL_CTX[@]}" apply -f -

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
echo "    svc:      kubectl ${KUBECTL_CTX[*]} -n ${NS} get svc"
echo "    class:    kubectl ${KUBECTL_CTX[*]} get ingressclass"
echo "    next:     apply staging Ingress (overlays/staging) + firewall 80/443"
