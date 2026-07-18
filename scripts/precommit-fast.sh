#!/usr/bin/env bash
# Fast pre-commit gate (W5.2 / W5.4): Biome on staged TS + package typecheck.
# Skips when no staged .ts/.tsx (docs/config-only commits).
# Never runs DB migrate or whole-repo e2e.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGED=()
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  STAGED+=("$f")
done < <(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx)$' || true)

if [[ ${#STAGED[@]} -eq 0 ]]; then
  echo "precommit: no staged .ts/.tsx — skip lint/typecheck"
  exit 0
fi

echo "precommit: Biome check --write (${#STAGED[@]} staged TS file(s))"
# Auto-fix format/imports on staged files only; re-stage after.
bunx biome check --write --files-ignore-unknown=true --no-errors-on-unmatched \
  "${STAGED[@]}"
git add -- "${STAGED[@]}"

need_facebook=0
need_ingest=0
need_root=0
for f in "${STAGED[@]}"; do
  case "$f" in
    scrapers/facebook/*) need_facebook=1 ;;
    services/homie-ingest/*) need_ingest=1 ;;
    db/*|lib/*|drizzle.config.ts) need_root=1 ;;
  esac
done

if [[ "$need_facebook" -eq 1 ]]; then
  echo "precommit: typecheck scrapers/facebook"
  (cd scrapers/facebook && bun run typecheck)
fi
if [[ "$need_ingest" -eq 1 ]]; then
  echo "precommit: typecheck services/homie-ingest"
  (cd services/homie-ingest && bun run typecheck)
fi
if [[ "$need_root" -eq 1 ]]; then
  echo "precommit: typecheck root (db/lib)"
  bunx tsc --noEmit -p tsconfig.json
fi

echo "precommit: ok"
