# Homie Alerts (Slack bot)

Bot-token Slack app for Grafana + Argo CD notifications. Secrets stay out of git
(`~/.config/homie/slack.env`).

## One-time setup

```bash
# 1. Login (CLI)
slack auth login --no-prompt
# Run the printed /slackauthticket … slash command in Slack, then:
slack auth login --ticket '<ticket>' --challenge '<code>'

# 2. Homie workspace (do NOT reuse clinic)
# Real workspace: create at https://slack.com/get-started#/createnew
# Or developer sandbox:
slack sandbox create --name Homie --domain homie-alerts --password '<choose>' --template empty

# 3. Create app from this manifest
open "https://api.slack.com/apps?new_app=1"
# → From an app manifest → paste manifest.json → Create
# → Install to Workspace → copy Bot User OAuth Token (xoxb-…)

# 4. Channels (create in Slack UI), then copy each Channel ID (C…)
#    #homie-alerts-grafana         → SLACK_CHANNEL_ID_GRAFANA
#    #homie-alerts-argocd          → SLACK_ARGOCD_CHANNEL_ID
#    #homie-alerts-argo-workflows  → SLACK_ARGO_WORKFLOWS_CHANNEL_ID
#    #homie-runtime-errors         → SLACK_RUNTIME_ERRORS_CHANNEL_ID
#    #homie-new-postings           → SLACK_NEW_POSTINGS_CHANNEL_ID
#    (deferred) #homie-alerts-temporal → SLACK_TEMPORAL_CHANNEL_ID
# Invite @Homie Alerts into each channel (Integrations → Add apps).

# 5. Store secrets locally
mkdir -p ~/.config/homie
cat > ~/.config/homie/slack.env <<'EOF'
# Homie Slack — never commit
SLACK_BOT_TOKEN=xoxb-REPLACE
SLACK_CHANNEL_ID_GRAFANA=C…
SLACK_ARGOCD_CHANNEL_ID=C…
SLACK_ARGO_WORKFLOWS_CHANNEL_ID=C…
SLACK_RUNTIME_ERRORS_CHANNEL_ID=C…
SLACK_NEW_POSTINGS_CHANNEL_ID=C…
SLACK_TEMPORAL_CHANNEL_ID=
SLACK_CHANNEL_ID=
EOF
chmod 600 ~/.config/homie/slack.env

# Shell load (once):
# echo '[ -f "$HOME/.config/homie/slack.env" ] && source "$HOME/.config/homie/slack.env"' >> ~/.zshrc

# 6. Apply to k3s (when cluster packs are up)
source ~/.zshrc
./scripts/apply-grafana-slack-secret.sh
./scripts/apply-argocd-slack-secret.sh
```

See `infra/k3s/monitoring/README-slack.md` and `infra/k3s/argocd/README-slack.md`.
