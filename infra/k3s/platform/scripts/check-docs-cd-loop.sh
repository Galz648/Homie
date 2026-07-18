#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
# platform/scripts → Homie root
! rg -n "Image build / Zot / overlay pin — \*\*deferred\*\*" "$ROOT/infra/SPEC.md" \
  || { echo "SPEC still says pin deferred" >&2; exit 1; }
rg -q "assert-worker-pin" "$ROOT/infra/SPEC.md"
rg -q "assert-worker-pin" "$ROOT/infra/k3s/platform/argo-workflows/README.md"
rg -q "homie-trigger-scrape" "$ROOT/infra/k3s/platform/argo-workflows/README.md"
rg -q "homie-trigger-scrape" "$ROOT/infra/k3s/platform/ci-lane/README.md"
rg -q "assert-worker-pin" "$ROOT/infra/k3s/platform/ci-lane/README.md"
! rg -q "Image build / pin.*Deferred until" "$ROOT/infra/k3s/platform/ci-lane/README.md"
echo "ok: docs-cd-loop AC"
