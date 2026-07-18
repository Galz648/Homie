#!/usr/bin/env bash
# Apply local Slack bot token → argocd/argocd-notifications-secret (key: slack-token).
# Single source of truth: ~/.config/homie/slack.env
#
# Channel is wired in infra/k3s/argocd/values.yaml (#homie-alerts-argocd).
# Invite the bot to that channel before expecting delivery.
set -euo pipefail

ENV_FILE="${SLACK_ENV_FILE:-$HOME/.config/homie/slack.env}"
NS="${NS:-argocd}"
SECRET_NAME="${SECRET_NAME:-argocd-notifications-secret}"

# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

if [[ -z "${SLACK_BOT_TOKEN:-}" ]]; then
  echo "SLACK_BOT_TOKEN empty — source ~/.zshrc first (or set SLACK_ENV_FILE)" >&2
  exit 1
fi
if [[ -z "${SLACK_ARGOCD_CHANNEL_ID:-}" ]]; then
  echo "SLACK_ARGOCD_CHANNEL_ID missing in $ENV_FILE (expected for #homie-alerts-argocd)" >&2
  exit 1
fi

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: required command not found: $1" >&2
    exit 1
  }
}
need kubectl

kubectl -n "${NS}" create secret generic "${SECRET_NAME}" \
  --from-literal=slack-token="$SLACK_BOT_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME} (slack-token)"
echo "    channel (values): homie-alerts-argocd  id=${SLACK_ARGOCD_CHANNEL_ID}"
echo "    next: cd infra/k3s/argocd && ./install.sh --wait --timeout 10m"
