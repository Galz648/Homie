#!/usr/bin/env bash
# Apply local Slack config → monitoring/grafana-slack Secret.
# Single source of truth: ~/.config/homie/slack.env
# (also sourced by ~/.zshrc / ~/.zprofile — run: source ~/.zshrc)
set -euo pipefail

ENV_FILE="${SLACK_ENV_FILE:-$HOME/.config/homie/slack.env}"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

if [[ -z "${SLACK_BOT_TOKEN:-}" ]]; then
  echo "SLACK_BOT_TOKEN empty — source ~/.zshrc first" >&2
  exit 1
fi

# Temporal channel optional until Temporal is in play
need_vars=(SLACK_CHANNEL_ID_GRAFANA SLACK_ARGOCD_CHANNEL_ID)
for v in "${need_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "$v missing in $ENV_FILE" >&2
    exit 1
  fi
done

CHANNEL_DEFAULT="${SLACK_CHANNEL_ID:-$SLACK_CHANNEL_ID_GRAFANA}"
TEMPORAL_ID="${SLACK_TEMPORAL_CHANNEL_ID:-$SLACK_CHANNEL_ID_GRAFANA}"

kubectl -n monitoring create secret generic grafana-slack \
  --from-literal=SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN" \
  --from-literal=SLACK_CHANNEL_ID_GRAFANA="$SLACK_CHANNEL_ID_GRAFANA" \
  --from-literal=SLACK_TEMPORAL_CHANNEL_ID="$TEMPORAL_ID" \
  --from-literal=SLACK_ARGOCD_CHANNEL_ID="$SLACK_ARGOCD_CHANNEL_ID" \
  --from-literal=SLACK_CHANNEL_ID="$CHANNEL_DEFAULT" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret monitoring/grafana-slack"
