#!/usr/bin/env bash
# Install / upgrade Argo CD into namespace `argocd`.
#
# Usage:
#   ./install.sh
#   ./install.sh --wait --timeout 10m
#   NS=argocd RELEASE=homie-argocd ./install.sh --dry-run
#
# Extra argv are forwarded to `helm upgrade --install`.
# After install, optionally apply Application stubs:
#   kubectl apply -f applications/

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS="${NS:-argocd}"
RELEASE="${RELEASE:-homie-argocd}"
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
helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update argo

echo "==> namespace ${NS}"
kubectl create namespace "${NS}" --dry-run=client -o yaml | kubectl apply -f -

echo "==> helm dependency build (${ROOT})"
helm dependency build "${ROOT}"

echo "==> helm upgrade --install ${RELEASE} -n ${NS}"
helm upgrade --install "${RELEASE}" "${ROOT}" \
  --namespace "${NS}" \
  --values "${VALUES}" \
  "$@"

echo "==> done"
echo "    release:  ${RELEASE}"
echo "    namespace: ${NS}"
echo "    pods:     kubectl get pods -n ${NS}"
echo "    admin:    kubectl -n ${NS} get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo"
echo "    ui:       kubectl -n ${NS} port-forward svc/${RELEASE}-server 8080:80"
echo "    apps:     kubectl apply -f ${ROOT}/applications/  # after CRDs are Ready"
