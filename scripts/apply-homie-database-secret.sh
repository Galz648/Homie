#!/usr/bin/env bash
# Apply lane database URLs → k8s Secret for scrape/API workers.
#
# Production MUST be Supabase (from ~/.config/homie/database.production.env,
# synced from repo .env). Staging must NOT use production Supabase.
#
# Usage:
#   ./scripts/apply-homie-database-secret.sh production
#   ./scripts/apply-homie-database-secret.sh staging   # only if database.staging.env filled
#
# Droplet:
#   KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-database-secret.sh production
set -euo pipefail

LANE="${1:-}"
if [[ "$LANE" != "staging" && "$LANE" != "production" ]]; then
  echo "usage: $0 staging|production" >&2
  exit 1
fi

ENV_FILE="${HOMIE_DATABASE_ENV_FILE:-$HOME/.config/homie/database.${LANE}.env}"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

if [[ -z "${DATABASE_URL:-}" || -z "${DIRECT_URL:-}" ]]; then
  echo "DATABASE_URL and DIRECT_URL required in $ENV_FILE" >&2
  exit 1
fi

# Lane safety: production → Supabase only; staging → never Supabase
case "$LANE" in
  production)
    if [[ "$DATABASE_URL" != *supabase* || "$DIRECT_URL" != *supabase* ]]; then
      echo "refusing: production lane requires Supabase DATABASE_URL/DIRECT_URL" >&2
      exit 1
    fi
    ;;
  staging)
    if [[ "$DATABASE_URL" == *supabase* || "$DIRECT_URL" == *supabase* ]]; then
      echo "refusing: staging must not use production Supabase" >&2
      exit 1
    fi
    ;;
esac

NS="homie-${LANE}"
SECRET_NAME="${SECRET_NAME:-homie-database}"

kubectl get ns "$NS" >/dev/null

kubectl -n "$NS" create secret generic "$SECRET_NAME" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=DIRECT_URL="$DIRECT_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME}"
echo "    mount via envFrom.secretRef when scrape/API worker is deployed"
