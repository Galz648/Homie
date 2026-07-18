#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
# scripts is under infra/k3s/platform/argo-workflows/scripts → 5 levels to repo root
T="$ROOT/infra/k3s/platform/argo-workflows/templates/homie-trigger-scrape.yaml"
E="$ROOT/infra/k3s/platform/argo-workflows/examples/ci-trigger-scrape.yaml"
test -f "$T" && test -f "$E"
rg -q "scrapeFacebookGroup" "$T"
rg -q "scrape-temporal" "$T"
if rg -q "temporalio/admin-tools" "$T" "$E"; then
  echo "ERROR: must not use admin-tools image" >&2
  exit 1
fi
rg -q "homie-trigger-scrape" "$E"
echo "ok: trigger-scrape AC"
