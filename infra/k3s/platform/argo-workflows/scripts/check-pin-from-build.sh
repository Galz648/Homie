#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
T="$ROOT/infra/k3s/platform/argo-workflows/templates/homie-build-images.yaml"
E="$ROOT/infra/k3s/platform/argo-workflows/examples/github-ci-ssh.secret.example.yaml"
test -f "$T" && test -f "$E"
rg -q "name: pin-overlay" "$T"
rg -q "github-ci-ssh" "$T"
rg -q 'chore\(k3s\): pin' "$T"
rg -q "kubectl set image" "$T"
rg -q "optional: true" "$T"
rg -q "REPLACE_WITH_DEPLOY_KEY" "$E"
echo "ok: pin-from-build AC"
