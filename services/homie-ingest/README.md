# Homie ingest API

Public auth-backed HTTP service that upserts cleaned listings into
`apartment_listings` and notifies Slack on successful write.

The Cloudflare Agent never receives `DATABASE_URL` — only a Bearer token
for `POST /ingest/listings`.

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/healthz` | none | liveness/readiness |
| POST | `/ingest/listings` | `Authorization: Bearer <HOMIE_INGEST_BEARER_TOKEN>` | idempotent upsert by `postId` |

## Body

```json
{
  "postId": "required-facebook-post-id",
  "price": 7500,
  "currency": "ILS",
  "entryDate": "2026-08-01T00:00:00.000Z",
  "contactPhone": "+972…",
  "address": "…",
  "conditionals": "freeform caveats"
}
```

## Images

`apartment_listings.images` (`text[]`, default `[]`) is **not** trusted from
the request body in production. On every upsert, `createDrizzleStore` looks
up `raw_facebook_posts` by `postId` and copies its `images` column
(`images ?? []`) into `apartment_listings`. Empty arrays are valid — a post
with no scraped images still upserts successfully.

`ListingIngestBody.images` exists only as a test-only seed for
`createMemoryStore` (which has no `raw_facebook_posts` to read from). Any
`images` sent in the real `/ingest/listings` body is silently ignored by the
drizzle-backed store.

`UpsertResult` (passed to the Slack notifier) always includes `images:
string[]` and, when available, `postUrl` from `raw_facebook_posts.url`.

## Local check

```bash
python3 scripts/check-homie-ingest-api.py
```
