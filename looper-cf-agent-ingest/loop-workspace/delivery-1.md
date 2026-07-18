# delivery-1 — cf-agent-ingest

## Packages completed

| id | merge / tip | AC |
|----|-------------|-----|
| schema-listings | ff `2b1ca4e` | check-apartment-listings-schema.py → 0 |
| ingest-api | ff `b7fd093` | check-homie-ingest-api.py → 0 |
| temporal-ff | merge `e8a8176` | check-temporal-ff-agent.py → 0 |
| agent-contract | ff `742bed6` | check-listing-ingest-contract.py → 0 |

Branch naming note: package branches used `feat/cf-agent-ingest--<id>` (git cannot nest under `feat/cf-agent-ingest/<id>`).

## Artifacts

- `apartment_listings` in Drizzle + `drizzle/0003_apartment_listings.sql`
- `services/homie-ingest` Bearer ingest + Slack on write + k8s base
- Temporal FF notify to CF Agent webhook
- `contracts/listing-ingest` + `agents/listing-extract` stub + ADR

## Next

PARALLEL-REPORT.md + delivery_gate.
