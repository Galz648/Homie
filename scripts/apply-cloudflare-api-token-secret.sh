#!/usr/bin/env bash
# Apply Cloudflare API token → Secret for Argo wrangler deploy.
#
# Reads ~/.config/homie/cloudflare.env (never commit).
#
# Usage:
#   KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-cloudflare-api-token-secret.sh
set -euo pipefail

ENV_FILE="${HOMIE_CLOUDFLARE_ENV_FILE:-$HOME/.config/homie/cloudflare.env}"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN required in $ENV_FILE" >&2
  exit 1
fi

NS="${NAMESPACE:-argo}"
SECRET_NAME="${SECRET_NAME:-cloudflare-api-token}"

kubectl get ns "$NS" >/dev/null
kubectl -n "$NS" create secret generic "$SECRET_NAME" \
  --from-literal=CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME}"
