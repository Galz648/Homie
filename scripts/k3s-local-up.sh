#!/usr/bin/env bash
# Create / reuse local Homie k3d cluster (k3s-in-Docker on Docker Desktop).
#
# Usage:
#   ./scripts/k3s-local-up.sh
#   CLUSTER=homie-local ./scripts/k3s-local-up.sh

set -euo pipefail

CLUSTER="${CLUSTER:-homie-local}"
CONTEXT="k3d-${CLUSTER}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: required command not found: $1" >&2
    exit 1
  }
}

need docker
need k3d
need kubectl

if ! docker info >/dev/null 2>&1; then
  echo "error: Docker is not running (start Docker Desktop)" >&2
  exit 1
fi

if k3d cluster list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx "${CLUSTER}"; then
  echo "==> cluster ${CLUSTER} already exists"
else
  echo "==> creating k3d cluster ${CLUSTER}"
  k3d cluster create "${CLUSTER}" \
    --agents 0 \
    --kubeconfig-update-default=true \
    --kubeconfig-switch-context=true
fi

kubectl config use-context "${CONTEXT}"
kubectl wait --for=condition=Ready node --all --timeout=120s
echo "==> Ready. context=${CONTEXT}"
kubectl get nodes
