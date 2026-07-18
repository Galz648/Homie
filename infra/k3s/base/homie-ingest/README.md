# Homie ingest API — Bearer-auth upsert into apartment_listings + Slack on write.
#
# Secrets (out of band):
#   ./scripts/apply-homie-ingest-secret.sh staging|production
#   ./scripts/apply-homie-database-secret.sh staging|production
#   ./scripts/apply-homie-slack-secret.sh staging|production
#     → SLACK_BOT_TOKEN + lane ingest-listings + runtime-errors channel IDs
#     staging:    #homie-listings-ingest-staging (SLACK_STAGING_INGEST_LISTINGS_CHANNEL_ID)
#     production: #homie-listings-ingest (SLACK_INGEST_LISTINGS_CHANNEL_ID)
#
# This is a separate channel from the scrape worker's raw-postings channel
# (#homie-raw-postings[-staging]) — ingest posts one mrkdwn message per
# listing upserted, with the Facebook post link + image links (or
# "(no images)" when empty). Optional HOMIE_INGEST_SLACK_CHANNEL_ID overrides
# the lane default.
#
# Local contract tests:
#   python3 scripts/check-homie-ingest-api.py
