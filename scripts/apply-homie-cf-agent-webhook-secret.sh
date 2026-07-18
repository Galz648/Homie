#!/usr/bin/env bash
# Apply CF Agent webhook shared secret → Secret for fb-scrape-worker.
#
# Reads ~/.config/homie/cf-agent-webhook.env (never commit).
#
# Keys:
#   HOMIE_CF_AGENT_WEBHOOK_SECRET  (required)
#   HOMIE_CF_AGENT_WEBHOOK_AUTH    (optional, default bearer)
#   HOMIE_CF_AGENT_WEBHOOK_URL     (optional — often set in ConfigMap instead)
#
# Usage:
#   KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-cf-agent-webhook-secret.sh staging
set -euo pipefail

LANE="${1:-}"
if [[ "$LANE" != "staging" && "$LANE" != "production" ]]; then
  echo "usage: $0 staging|production" >&2
  exit 1
fi

ENV_FILE="${HOMIE_CF_AGENT_WEBHOOK_ENV_FILE:-$HOME/.config/homie/cf-agent-webhook.env}"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

if [[ -z "${HOMIE_CF_AGENT_WEBHOOK_SECRET:-}" ]]; then
  echo "HOMIE_CF_AGENT_WEBHOOK_SECRET required in $ENV_FILE" >&2
  exit 1
fi

NS="homie-${LANE}"
SECRET_NAME="${SECRET_NAME:-homie-cf-agent-webhook}"

ARGS=(
  --from-literal=HOMIE_CF_AGENT_WEBHOOK_SECRET="$HOMIE_CF_AGENT_WEBHOOK_SECRET"
  --from-literal=HOMIE_CF_AGENT_WEBHOOK_AUTH="${HOMIE_CF_AGENT_WEBHOOK_AUTH:-bearer}"
)
if [[ -n "${HOMIE_CF_AGENT_WEBHOOK_URL:-}" ]]; then
  ARGS+=(--from-literal=HOMIE_CF_AGENT_WEBHOOK_URL="$HOMIE_CF_AGENT_WEBHOOK_URL")
fi

kubectl get ns "$NS" >/dev/null
kubectl -n "$NS" create secret generic "$SECRET_NAME" \
  "${ARGS[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME}"
