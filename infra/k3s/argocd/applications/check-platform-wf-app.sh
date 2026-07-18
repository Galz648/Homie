#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
F="$ROOT/infra/k3s/argocd/applications/homie-argo-workflows-templates.yaml"
test -f "$F"
rg -q "kind: Application" "$F"
rg -q "homie-argo-workflows-templates" "$F"
rg -q "infra/k3s/platform/argo-workflows/templates" "$F"
rg -q "targetRevision: staging" "$F"
echo "ok: platform-wf-app AC"
