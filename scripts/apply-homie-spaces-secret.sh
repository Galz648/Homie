#!/usr/bin/env bash
# Apply Homie Spaces credentials → k8s Secret for scrape worker (per lane).
#
# Single source of truth:
#   ~/.config/homie/spaces.staging.env
#   ~/.config/homie/spaces.production.env
# (or HOMIE_SPACES_ENV_FILE override)
#
# Usage:
#   ./scripts/apply-homie-spaces-secret.sh staging
#   ./scripts/apply-homie-spaces-secret.sh production
#
# Droplet:
#   KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-spaces-secret.sh staging
set -euo pipefail

LANE="${1:-}"
if [[ "$LANE" != "staging" && "$LANE" != "production" ]]; then
  echo "usage: $0 staging|production" >&2
  exit 1
fi

ENV_FILE="${HOMIE_SPACES_ENV_FILE:-$HOME/.config/homie/spaces.${LANE}.env}"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

need=(
  HOMIE_IMAGE_UPLOAD_MODE
  HOMIE_IMAGES_BUCKET
  HOMIE_IMAGES_BASE_URL
  HOMIE_SPACES_ENDPOINT
  HOMIE_SPACES_REGION
  HOMIE_SPACES_KEY
  HOMIE_SPACES_SECRET
)
for v in "${need[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "$v missing in $ENV_FILE" >&2
    exit 1
  fi
done

NS="homie-${LANE}"
SECRET_NAME="${SECRET_NAME:-homie-spaces-images}"

# Fail closed if bucket doesn't match lane (avoid staging key pointing at prod bucket)
case "$LANE" in
  staging)
    [[ "$HOMIE_IMAGES_BUCKET" == *staging* ]] || {
      echo "refusing: staging lane but HOMIE_IMAGES_BUCKET=$HOMIE_IMAGES_BUCKET" >&2
      exit 1
    }
    ;;
  production)
    [[ "$HOMIE_IMAGES_BUCKET" == *production* ]] || {
      echo "refusing: production lane but HOMIE_IMAGES_BUCKET=$HOMIE_IMAGES_BUCKET" >&2
      exit 1
    }
    ;;
esac

kubectl get ns "$NS" >/dev/null

kubectl -n "$NS" create secret generic "$SECRET_NAME" \
  --from-literal=HOMIE_IMAGE_UPLOAD_MODE="$HOMIE_IMAGE_UPLOAD_MODE" \
  --from-literal=HOMIE_IMAGES_BUCKET="$HOMIE_IMAGES_BUCKET" \
  --from-literal=HOMIE_IMAGES_BASE_URL="$HOMIE_IMAGES_BASE_URL" \
  --from-literal=HOMIE_SPACES_ENDPOINT="$HOMIE_SPACES_ENDPOINT" \
  --from-literal=HOMIE_SPACES_REGION="$HOMIE_SPACES_REGION" \
  --from-literal=HOMIE_SPACES_KEY="$HOMIE_SPACES_KEY" \
  --from-literal=HOMIE_SPACES_SECRET="$HOMIE_SPACES_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME} bucket=${HOMIE_IMAGES_BUCKET}"
echo "    mount via envFrom.secretRef when facebook scrape worker is deployed"
