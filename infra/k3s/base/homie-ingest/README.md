# Homie ingest API — Bearer-auth upsert into apartment_listings + Slack on write.
#
# Secrets (out of band):
#   ./scripts/apply-homie-ingest-secret.sh staging|production
#   ./scripts/apply-homie-database-secret.sh staging|production
#   ./scripts/apply-homie-slack-secret.sh staging|production
#     → SLACK_BOT_TOKEN + lane new-postings + runtime-errors channel IDs
#     staging:  #homie-new-postings-staging
#     production: #homie-new-postings
#
# Local contract tests:
#   python3 scripts/check-homie-ingest-api.py
