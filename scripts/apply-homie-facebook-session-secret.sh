#!/usr/bin/env bash
# Apply Playwright Facebook session → Secret facebook-session (key facebook_state.json).
#
# Usage:
#   ./scripts/apply-homie-facebook-session-secret.sh staging
#   HOMIE_FACEBOOK_STATE_PATH=~/.config/homie/facebook_state.json \
#     KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-facebook-session-secret.sh staging
set -euo pipefail

LANE="${1:-}"
if [[ "$LANE" != "staging" && "$LANE" != "production" ]]; then
  echo "usage: $0 staging|production" >&2
  exit 1
fi

STATE="${HOMIE_FACEBOOK_STATE_PATH:-$HOME/.config/homie/facebook_state.json}"
[[ -f "$STATE" ]] || {
  echo "missing session file: $STATE" >&2
  exit 1
}

NS="homie-${LANE}"
SECRET_NAME="${SECRET_NAME:-facebook-session}"

kubectl get ns "$NS" >/dev/null

kubectl -n "$NS" create secret generic "$SECRET_NAME" \
  --from-file=facebook_state.json="$STATE" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "ok: secret ${NS}/${SECRET_NAME} from $STATE"
