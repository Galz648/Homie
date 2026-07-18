#!/usr/bin/env bash
# Create / reuse local Homie k3d cluster (k3s-in-Docker on Docker Desktop).
#
# Publishes scrape-e2e host ports via the k3d loadbalancer:
#   54329 → scrape-postgres:5432
#   7233  → scrape-temporal:7233
#   8233  → scrape-temporal-ui:8233
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

SCRAPE_PORTS=(
  "54329:5432@loadbalancer"
  "7233:7233@loadbalancer"
  "8233:8233@loadbalancer"
)

ensure_scrape_ports() {
  local p
  for p in "${SCRAPE_PORTS[@]}"; do
    # Best-effort add; ignore if already present
    if k3d cluster edit "${CLUSTER}" --port-add "${p}" 2>/dev/null; then
      echo "==> port-add ${p}"
    else
      echo "==> port-add ${p} (skipped or already present)"
    fi
  done
}

if k3d cluster list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx "${CLUSTER}"; then
  echo "==> cluster ${CLUSTER} already exists"
  ensure_scrape_ports
else
  echo "==> creating k3d cluster ${CLUSTER}"
  k3d cluster create "${CLUSTER}" \
    --agents 0 \
    --kubeconfig-update-default=true \
    --kubeconfig-switch-context=true \
    --port "54329:5432@loadbalancer" \
    --port "7233:7233@loadbalancer" \
    --port "8233:8233@loadbalancer"
fi

kubectl config use-context "${CONTEXT}"
kubectl wait --for=condition=Ready node --all --timeout=120s
echo "==> Ready. context=${CONTEXT}"
kubectl get nodes
echo "==> scrape-e2e host ports: postgres :54329  temporal :7233  temporal-ui :8233"
echo "==> apply local overlay: kubectl apply -k infra/k3s/overlays/local"
