#!/usr/bin/env bash
# Optional helper — NOT wired to Husky (see docs/workstreams.md W5 migrate timing).
# Apply Drizzle migrations when schema/migration files are staged, or when forced.
#
# Env:
#   HOMIE_SKIP_DB_MIGRATE=1  — skip entirely (docs-only / no local DB)
#   HOMIE_DB_MIGRATE=1       — always migrate even if no schema files staged
#   DIRECT_URL / DATABASE_URL — from .env (DIRECT_URL preferred for migrate)
#
# Requires local Postgres (e.g. `supabase start`) when migration runs.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${HOMIE_SKIP_DB_MIGRATE:-}" == "1" ]]; then
  echo "db:migrate:precommit skipped (HOMIE_SKIP_DB_MIGRATE=1)"
  exit 0
fi

need_migrate=0
if [[ "${HOMIE_DB_MIGRATE:-}" == "1" ]]; then
  need_migrate=1
else
  staged="$(git diff --cached --name-only --diff-filter=ACM || true)"
  if echo "$staged" | grep -E -q '^(Homie-Website/src/db/schema\.ts|drizzle/.*\.(sql|json)|drizzle\.config\.ts)$'; then
    need_migrate=1
  fi
fi

if [[ "$need_migrate" -eq 0 ]]; then
  echo "db:migrate:precommit skipped (no schema/migration files staged; set HOMIE_DB_MIGRATE=1 to force)"
  exit 0
fi

if [[ ! -f .env ]] && [[ -z "${DIRECT_URL:-}" ]] && [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: db:migrate:precommit needs .env (DIRECT_URL) or exported DIRECT_URL/DATABASE_URL" >&2
  echo "       start local DB: supabase start" >&2
  echo "       or skip: HOMIE_SKIP_DB_MIGRATE=1 git commit ..." >&2
  exit 1
fi

echo "==> db:migrate:precommit (drizzle-kit migrate)"
# drizzle-kit loads dotenv via drizzle.config.ts
if ! bun run db:migrate; then
  echo "error: migration failed. Is Postgres up? (supabase start)" >&2
  echo "       or skip: HOMIE_SKIP_DB_MIGRATE=1 git commit ..." >&2
  exit 1
fi

echo "ok: migrations applied"
