#!/usr/bin/env bash
# Apply Slack bot token + CI poll channel → argo/homie-ci-poll-slack.
# Source: ~/.config/homie/slack.env (SLACK_BOT_TOKEN, SLACK_CI_POLL_CHANNEL_ID).
#
# Break-glass admin kubeconfig required:
#   KUBECONFIG=~/.kube/homie-k3s-admin.yaml ./scripts/apply-homie-ci-poll-slack-secret.sh
set -euo pipefail

ENV_FILE="${SLACK_ENV_FILE:-$HOME/.config/homie/slack.env}"
NS="${NS:-argo}"
SECRET_NAME="${SECRET_NAME:-homie-ci-poll-slack}"

# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

if [[ -z "${SLACK_BOT_TOKEN:-}" ]]; then
  echo "SLACK_BOT_TOKEN empty — set in $ENV_FILE" >&2
  exit 1
fi
if [[ -z "${SLACK_CI_POLL_CHANNEL_ID:-}" ]]; then
  echo "SLACK_CI_POLL_CHANNEL_ID missing in $ENV_FILE (#homie-alerts-ci-poll)" >&2
  exit 1
fi

command -v kubectl >/dev/null 2>&1 || {
  echo "error: kubectl required" >&2
  exit 1
}

kubectl -n "${NS}" create secret generic "${SECRET_NAME}" \
  --from-literal=SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN" \
  --from-literal=SLACK_CI_POLL_CHANNEL_ID="$SLACK_CI_POLL_CHANNEL_ID" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME}"
echo "    channel: #homie-alerts-ci-poll  id=${SLACK_CI_POLL_CHANNEL_ID}"
