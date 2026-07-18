# Listing ingest contracts

Shared JSON Schema for the Cloudflare Agent ↔ Homie cleaned-listing path.

| Schema | Direction | Source of truth in code |
|--------|-----------|-------------------------|
| `agent-request.schema.json` | Temporal → Agent webhook | `scrapers/facebook/src/notifyListingAgent.ts` |
| `homie-ingest-body.schema.json` | Agent → Homie `POST /ingest/listings` | `services/homie-ingest/src/types.ts` |

Fixtures under `fixtures/` must validate against these schemas. Drift is caught by:

```bash
python3 scripts/check-listing-ingest-contract.py
```

Auth is documented in `docs/adr/listing-ingest-agent.md` (Temporal→Agent shared secret; Agent→Homie Bearer). The Agent never receives `DATABASE_URL` or Hyperdrive.
