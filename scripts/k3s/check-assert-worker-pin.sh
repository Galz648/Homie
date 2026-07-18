#!/usr/bin/env bash
# AC for assert-pin package
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
test -x "$ROOT/scripts/k3s/assert-worker-pin.sh" || chmod +x "$ROOT/scripts/k3s/assert-worker-pin.sh"
HOMIE_ASSERT_PIN_DRY=1 "$ROOT/scripts/k3s/assert-worker-pin.sh" staging
HOMIE_ASSERT_PIN_DRY=1 "$ROOT/scripts/k3s/assert-worker-pin.sh" production
echo "ok: assert-pin AC"
