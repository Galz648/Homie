#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
# base/scrape-db-migrate → Homie: ../../../../
CM="$ROOT/infra/k3s/base/scrape-db-migrate/configmap.yaml"
JOB="$ROOT/infra/k3s/base/scrape-db-migrate/job.yaml"
rg -q "argocd.argoproj.io/hook: PreSync" "$CM"
rg -q "argocd.argoproj.io/hook: PreSync" "$JOB"
rg -q "BeforeHookCreation" "$CM"
rg -q "BeforeHookCreation" "$JOB"
rg -q "staging/staging" "$JOB"
rg -q "production/main" "$JOB"
OUT=$(kubectl kustomize "$ROOT/infra/k3s/overlays/staging")
echo "$OUT" | rg -q "HOMIE_GIT_BRANCH: staging"
echo "$OUT" | rg -q "HOMIE_LANE: staging"
COUNT=$(echo "$OUT" | rg -c "hook: PreSync" || true)
[[ "${COUNT:-0}" -ge 2 ]] || { echo "need >=2 PreSync hooks in staging render, got $COUNT" >&2; exit 1; }
echo "ok: migrate-presync AC"
