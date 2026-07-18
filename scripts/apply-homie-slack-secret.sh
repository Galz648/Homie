#!/usr/bin/env bash
# Apply Slack bot + lane channel IDs → Secret for fb-scrape-worker + homie-ingest.
#
# Reads ~/.config/homie/slack.env (never commit).
#
# Usage:
#   KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-slack-secret.sh staging
set -euo pipefail

LANE="${1:-}"
if [[ "$LANE" != "staging" && "$LANE" != "production" ]]; then
  echo "usage: $0 staging|production" >&2
  exit 1
fi

ENV_FILE="${HOMIE_SLACK_ENV_FILE:-$HOME/.config/homie/slack.env}"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

if [[ -z "${SLACK_BOT_TOKEN:-}" ]]; then
  echo "SLACK_BOT_TOKEN required in $ENV_FILE" >&2
  exit 1
fi

NS="homie-${LANE}"
SECRET_NAME="${SECRET_NAME:-homie-slack}"

ARGS=(
  --from-literal=SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN"
)
if [[ "$LANE" == "staging" ]]; then
  if [[ -z "${SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID:-}" ]]; then
    echo "SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID required for staging" >&2
    exit 1
  fi
  if [[ -z "${SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID:-}" ]]; then
    echo "SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID required for staging" >&2
    exit 1
  fi
  ARGS+=(
    --from-literal=SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID="$SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID"
    --from-literal=SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID="$SLACK_STAGING_NEW_POSTINGS_CHANNEL_ID"
  )
else
  if [[ -z "${SLACK_RUNTIME_ERRORS_CHANNEL_ID:-}" ]]; then
    echo "SLACK_RUNTIME_ERRORS_CHANNEL_ID required for production" >&2
    exit 1
  fi
  if [[ -z "${SLACK_NEW_POSTINGS_CHANNEL_ID:-}" ]]; then
    echo "SLACK_NEW_POSTINGS_CHANNEL_ID required for production" >&2
    exit 1
  fi
  ARGS+=(
    --from-literal=SLACK_RUNTIME_ERRORS_CHANNEL_ID="$SLACK_RUNTIME_ERRORS_CHANNEL_ID"
    --from-literal=SLACK_NEW_POSTINGS_CHANNEL_ID="$SLACK_NEW_POSTINGS_CHANNEL_ID"
  )
fi

kubectl get ns "$NS" >/dev/null
kubectl -n "$NS" create secret generic "$SECRET_NAME" \
  "${ARGS[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME}"
