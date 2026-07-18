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

## Local check

```bash
python3 scripts/check-homie-ingest-api.py
```
