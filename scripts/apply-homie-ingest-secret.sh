#!/usr/bin/env bash
# Apply Homie ingest Bearer token → Secret for homie-ingest Deployment.
#
# Reads ~/.config/homie/ingest.env (never commit).
#
# Usage:
#   KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-ingest-secret.sh staging
set -euo pipefail

LANE="${1:-}"
if [[ "$LANE" != "staging" && "$LANE" != "production" ]]; then
  echo "usage: $0 staging|production" >&2
  exit 1
fi

ENV_FILE="${HOMIE_INGEST_ENV_FILE:-$HOME/.config/homie/ingest.env}"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

if [[ -z "${HOMIE_INGEST_BEARER_TOKEN:-}" ]]; then
  echo "HOMIE_INGEST_BEARER_TOKEN required in $ENV_FILE" >&2
  exit 1
fi

NS="homie-${LANE}"
SECRET_NAME="${SECRET_NAME:-homie-ingest}"

kubectl get ns "$NS" >/dev/null
kubectl -n "$NS" create secret generic "$SECRET_NAME" \
  --from-literal=HOMIE_INGEST_BEARER_TOKEN="$HOMIE_INGEST_BEARER_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME}"
