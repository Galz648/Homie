# Homie Facebook scrape (TypeScript + Temporal + Playwright)

Auth probe + scrape pipeline + Bun AC runners. One Temporal workflow = one Facebook group.

Local e2e substrate is **k3s** (`homie` ns): scrape Postgres + Temporal — not Docker Compose.

## Groups config

Edit [`src/groups.ts`](./src/groups.ts):

```ts
export const facebookGroups: FacebookGroup[] = [
  { id: "35819517694", enabled: true },
  {
    id: "telavivroommates",
    url: "https://www.facebook.com/groups/telavivroommates",
    enabled: true,
  },
];
```

## Schedules (Temporal)

On worker start, `ensureScrapeSchedules` creates/updates one Schedule per enabled
group:

| | |
|--|--|
| Cadence | **~Every 4 hours** at `:00` (**09 / 13 / 17 / 21**) |
| Window | **09:00–21:00** `Asia/Jerusalem` (no runs **22:00–08:59**) |
| Overlap | `SKIP` if previous run still open |
| Schedule id | `fb-scrape-<groupId>` |

Override TZ with `HOMIE_SCRAPE_TZ`.

## Local k3s setup

```bash
./scripts/k3s-local-up.sh
kubectl apply -k infra/k3s/overlays/local
cd scrapers/facebook && bun install && bunx playwright install chromium
bun run check:postgres   # migrate + scrape_cursors / raw_facebook_posts
bun run check:temporal   # gRPC :7233
```

| Host port | Service |
|-----------|---------|
| `127.0.0.1:54329` | scrape Postgres (`DATABASE_URL`) |
| `127.0.0.1:7233` | Temporal gRPC (`TEMPORAL_ADDRESS`) |
| `127.0.0.1:8233` | Temporal UI |

Secrets (never commit):

- `~/.config/homie/slack.env` — `SLACK_BOT_TOKEN`, prod `SLACK_RUNTIME_ERRORS_CHANNEL_ID`, staging `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID`
- `~/.config/homie/facebook_state.json` — `bun run renew` or `bun run import-chrome-session`
- `~/.config/homie/spaces.env` — Spaces upload (`HOMIE_IMAGES_BUCKET`, `HOMIE_IMAGES_BASE_URL`, `HOMIE_SPACES_*`)

## Staging Slack

| | |
|--|--|
| Channel | `#homie-runtime-errors-staging` |
| Channel ID | `C0BJ6AMH2LE` |
| Env | `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID` |
| Purpose | Staging-lane Temporal scrape / auth alerts only |

Prod keeps using `SLACK_RUNTIME_ERRORS_CHANNEL_ID` → `#homie-runtime-errors`.
Staging worker must set `HOMIE_LANE=staging` (or `HOMIE_ENV=staging`) so
`loadSettings()` resolves `SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID` — it does
**not** fall back to the prod channel. Local note:
`~/.config/homie/slack-staging-channel.md` (test message posted at channel create).

## Raw post images (Temporal activity)

Activity `scrapeFacebookGroupFeed` → upsert → `persistListingImages`.
`loadSettings()` loads `spaces.env` so the worker can upload when mode=`spaces`.

| Mode | Env | Behavior |
|------|-----|----------|
| **noop** (default) | `HOMIE_IMAGE_UPLOAD_MODE` unset/`noop` | Keep Facebook CDN URLs in `raw_facebook_posts.images` — local e2e |
| **spaces** | `HOMIE_IMAGE_UPLOAD_MODE=spaces` | Download → PutObject to DO Spaces → persist CDN URLs |

```bash
# Manual one-image smoke (needs spaces.env + real bucket):
bun run smoke:spaces-upload
```

See `infra/terraform/stacks/k3s/README.md` for staging/production bucket TF. Apply lane Secret with `scripts/apply-homie-spaces-secret.sh`.

## AC runners (Bun / TypeScript)

```bash
bun run check:postgres
bun run check:temporal
bun run check:session-ops
bun run check:pipeline
bun run check:e2e-mocks          # automated CI gate (no live Facebook)
bun run preprod:e2e-online       # manual live e2e — before prod (see docs/workstreams.md W7)
bun run smoke:spaces-upload      # manual Spaces one-image upload
```

**E2E policy:** mocks on every CI/PR; live Facebook only when you activate it (pre-prod). Not a blocking staging CI step.

## Run worker (host)

```bash
DATABASE_URL=postgresql://homie:homie@127.0.0.1:54329/homie \
TEMPORAL_ADDRESS=127.0.0.1:7233 \
bun run worker
```

With Spaces uploads (staging/prod-style):

```bash
# spaces.env must set HOMIE_IMAGE_UPLOAD_MODE=spaces + bucket/creds
DATABASE_URL=… TEMPORAL_ADDRESS=… bun run worker
```

Task queue: `homie-fb-scrape`.

## Slack runtime errors

Auth failures post to `#homie-runtime-errors` via `formatRuntimeErrorMessage` /
`formatAuthFailureMessage` in [`src/slackNotify.ts`](./src/slackNotify.ts)
(fallback notification line + Block Kit body: What / Where / Evidence / Next).

## Session renew

See [`docs/session-renew.md`](./docs/session-renew.md).
