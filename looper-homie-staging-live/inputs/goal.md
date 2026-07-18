# Goal — Homie staging live scrape ready

## Outcome

Staging lane on Homie k3s runs a **live** Facebook scrape end-to-end:

- Temporal worker Deployment hits **real Facebook** (group structure from
  `35819517694`; mocks use structure only — never commit live post bodies).
- Upserts `raw_facebook_posts` (dedup `postId`); images upload to the
  **staging** Spaces bucket (`HOMIE_IMAGE_UPLOAD_MODE=spaces` required).
- Runtime Slack alerts go to **`#homie-runtime-errors-staging` only**
  (separate from prod).

Root git branch (fork + merge target): **`feat/homie-staging-live`**
(created from `infra`). Root worktree:
`/Users/galzafar/Documents/GitHub/homie-worktrees/homie-staging-live`.
Package worktrees under `/Users/galzafar/Documents/GitHub/homie-worktrees/`.
Package branches: `pkg/<id>`.

## Repo

`/Users/galzafar/Documents/GitHub/Homie`

## Staging Slack (created 2026-07-18)

| | |
|--|--|
| Channel | `#homie-runtime-errors-staging` |
| Channel ID | `C0BJ6AMH2LE` |
| Env key | `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID` in `~/.config/homie/slack.env` |
| Test message | Posted at create time (`ts=1784384007.005829`) |
| Local note | `~/.config/homie/slack-staging-channel.md` |

Worker/config must use this env for staging lane — **never** prod
`SLACK_RUNTIME_ERRORS_CHANNEL_ID`.

## Context (must read)

- `docs/workstreams.md` — W3.1 raw posts, W4.2b Spaces, W6/W7 e2e
- Current WIP on `infra`: `raw_facebook_posts`, Spaces upload in
  `scrapers/facebook/src/pipeline/images.ts`
- `feat/homie-spaces-images` — Spaces TF + apply-secret scripts (merge/port)
- `infra/k3s/overlays/staging/` — today mostly facebook-mock; needs worker
- Cluster: staging k3s **partially up** — verify, don’t rebuild droplet from zero
- Group: `35819517694` in `scrapers/facebook/src/groups.ts`

## Acceptance criteria (whole loop)

1. Root branch + worktree exist; packages merge onto `feat/homie-staging-live`.
2. Code: raw posts + Spaces upload + Spaces TF/scripts landed; local
   `check:e2e-mocks` green; fixtures use group **structure** only.
3. Staging Postgres + Temporal usable; drizzle through `0002` applied.
4. Staging Spaces Secret applied; smoke upload to staging bucket OK.
5. k8s Deployment for FB Temporal worker with envFrom: DB, Spaces, FB session,
   `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID`.
6. Alerts only to `#homie-runtime-errors-staging`.
7. **Live prove:** one scrape of group `35819517694`; rows in
   `raw_facebook_posts`; `images` are **Spaces** URLs; Slack (if any) on
   staging channel.
8. Docs match deployed path.

## Suggested packages (disjoint write_paths)

| id | group | deps | write_paths (sketch) |
|----|-------|------|----------------------|
| `land-code` | A | none | Homie-Website schema, drizzle/0002, scrapers/facebook pipeline/tests, seed |
| `spaces-staging` | A | none | infra TF spaces remnants if needed, scripts/apply-homie-spaces-secret.sh, staging secrets.example |
| `staging-data` | B | land-code | infra/k3s staging postgres/temporal overlays (if missing), migrate docs/scripts |
| `worker-deploy` | C | staging-data, spaces-staging | infra/k3s worker Deployment + kustomize staging |
| `slack-staging` | C | land-code | scrapers/facebook config + slackNotify staging channel wiring + README |
| `live-prove` | D | worker-deploy, slack-staging | loop-workspace evidence only (no secret commits) |
| `docs-close` | D | live-prove | docs/workstreams.md, scrapers/facebook/README.md |

Refine exact paths in `plan.md`; same-group paths must be disjoint.

## Anti-goals

- Force-push `feat/homie-staging-live` or `infra`
- Committing secrets, session files, live FB post bodies/PII
- Using prod Slack channel for staging
- Making live FB a blocking CI gate
- LLM listing extraction
- Rebuilding the droplet from scratch (cluster already partial)
