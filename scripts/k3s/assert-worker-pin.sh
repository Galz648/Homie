#!/usr/bin/env bash
# Assert git overlay newTag matches live fb-scrape-worker image for a lane.
# Usage:
#   ./scripts/k3s/assert-worker-pin.sh staging
#   HOMIE_ASSERT_PIN_DRY=1 ./scripts/k3s/assert-worker-pin.sh staging
set -euo pipefail

LANE="${1:-}"
if [[ "$LANE" != "staging" && "$LANE" != "production" && "$LANE" != "local" ]]; then
  echo "usage: $0 staging|production|local" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OVERLAY="$ROOT/infra/k3s/overlays/$LANE"
if [[ ! -f "$OVERLAY/kustomization.yaml" ]]; then
  echo "missing overlay: $OVERLAY/kustomization.yaml" >&2
  exit 1
fi

DESIRED=""
if command -v kubectl >/dev/null 2>&1; then
  DESIRED=$(kubectl kustomize "$OVERLAY" 2>/dev/null \
    | awk '
      /image:.*fb-scrape-worker/ { print $2; exit }
    ')
fi
if [[ -z "${DESIRED:-}" ]]; then
  TAG=$(awk '/newTag:/{print $2; exit}' "$OVERLAY/kustomization.yaml" || true)
  NAME=$(awk '/newName:/{print $2; exit}' "$OVERLAY/kustomization.yaml" || true)
  if [[ -z "$TAG" ]]; then
    if [[ "$LANE" == "production" || "$LANE" == "local" ]]; then
      echo "ok: no fb-scrape-worker pin in $LANE overlay yet (skipped)"
      exit 0
    fi
    echo "ERROR: no fb-scrape-worker image / newTag in $OVERLAY" >&2
    exit 1
  fi
  DESIRED="${NAME:-zot.local:5000/homie/fb-scrape-worker}:$TAG"
fi

echo "desired (git/kustomize): $DESIRED"

if [[ "${HOMIE_ASSERT_PIN_DRY:-}" == "1" ]]; then
  echo "ok: dry-run (skipped live Deployment check)"
  exit 0
fi

NS="homie"
case "$LANE" in
  staging) NS=homie-staging ;;
  production) NS=homie-production ;;
esac

LIVE=$(kubectl -n "$NS" get deploy fb-scrape-worker \
  -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)
if [[ -z "$LIVE" ]]; then
  echo "ERROR: could not read live image (ns=$NS deploy/fb-scrape-worker)" >&2
  exit 1
fi
echo "live: $LIVE"

if [[ "$LIVE" != "$DESIRED" ]]; then
  echo "ERROR: pin drift — live != git. Fix via chore(k3s): pin + Argo Sync (never kubectl set image)." >&2
  exit 1
fi
echo "ok: live image matches git pin"
