# scrape-db-migrate

Argo CD **PreSync** Job: clone the **lane’s git branch** →
`bun scripts/local-db/migrate.ts` against lane `homie-database`.

| Lane (`HOMIE_LANE`) | Git branch (`HOMIE_GIT_BRANCH`) | DB |
|---------------------|--------------------------------|-----|
| `staging` | `staging` | in-cluster scrape-postgres (never Supabase) |
| `production` | `main` | Supabase (must be Supabase URL) |

Overlays set both via `patch-scrape-db-migrate-env.yaml`. The Job **refuses**
mismatched lane/branch pairs and wrong DB host classes.

CI (`homie-ci-staging`) migrates ephemeral Postgres from `GIT_BRANCH=staging`
separately and asserts the same tables.
