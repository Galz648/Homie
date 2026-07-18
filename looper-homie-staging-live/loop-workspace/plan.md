# Parallel plan — Homie staging live

Root branch: `feat/homie-staging-live`  
Root worktree: `/Users/galzafar/Documents/GitHub/homie-worktrees/homie-staging-live`  
Worktree root: `/Users/galzafar/Documents/GitHub/homie-worktrees`

## land-code

- id: land-code
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/land-code
- branch: pkg/land-code
- write_paths: Homie-Website/src/db/schema.ts, Homie-Website/src/App.tsx, Homie-Website/src/worker.ts, drizzle/0002_raw_facebook_posts.sql, drizzle/meta/_journal.json, scrapers/facebook/src/pipeline/, scrapers/facebook/tests/, scrapers/facebook/package.json, scrapers/facebook/bun.lock, scrapers/facebook/fixtures/, scrapers/facebook/scripts/smokeSpacesUpload.ts, scrapers/facebook/scripts/checkScrapePipeline.ts, scripts/seed.ts
- ac_command: bash -lc 'cd /Users/galzafar/Documents/GitHub/Homie && test -f drizzle/0002_raw_facebook_posts.sql && rg -q raw_facebook_posts Homie-Website/src/db/schema.ts && cd scrapers/facebook && bun run check:e2e-mocks'

## spaces-staging

- id: spaces-staging
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/spaces-staging
- branch: pkg/spaces-staging
- write_paths: infra/terraform/stacks/k3s/spaces.tf, infra/terraform/stacks/k3s/variables.tf, infra/terraform/stacks/k3s/outputs.tf, infra/terraform/stacks/k3s/terraform.tfvars.example, infra/terraform/stacks/k3s/README.md, scripts/apply-homie-spaces-secret.sh, infra/k3s/overlays/staging/secrets.example.yaml, infra/k3s/overlays/README.md
- ac_command: bash -lc 'test -f infra/terraform/stacks/k3s/spaces.tf && test -f scripts/apply-homie-spaces-secret.sh && rg -q HOMIE_IMAGES_BUCKET infra/k3s/overlays/staging/secrets.example.yaml'

## staging-data

- id: staging-data
- deps: land-code
- parallel_group: B
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/staging-data
- branch: pkg/staging-data
- write_paths: infra/k3s/overlays/staging/, scripts/local-db/migrate.ts, docs/session-renew.md
- ac_command: bash -lc 'rg -q scrape-postgres infra/k3s/overlays/staging/kustomization.yaml || rg -q temporal infra/k3s/overlays/staging/kustomization.yaml; echo "operator: confirm migrate 0002 on staging Postgres separately"'

## worker-deploy

- id: worker-deploy
- deps: staging-data, spaces-staging
- parallel_group: C
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/worker-deploy
- branch: pkg/worker-deploy
- write_paths: infra/k3s/base/, infra/k3s/overlays/staging/, scrapers/facebook/Dockerfile
- ac_command: bash -lc 'rg -q scrapeFacebook\|fb-scrape\|homie-fb infra/k3s/overlays/staging/ && rg -q homie-spaces-images infra/k3s/overlays/staging/'

## slack-staging

- id: slack-staging
- deps: land-code
- parallel_group: C
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/slack-staging
- branch: pkg/slack-staging
- write_paths: scrapers/facebook/src/config.ts, scrapers/facebook/src/slackNotify.ts, scrapers/facebook/src/activities.ts, scrapers/facebook/tests/slackNotify.test.ts, scrapers/facebook/tests/slack.edgeCases.test.ts, scrapers/facebook/README.md
- ac_command: bash -lc 'cd scrapers/facebook && rg -q SLACK_STAGING_RUNTIME_ERRORS_CHANNEL_ID src/config.ts && rg -q homie-runtime-errors-staging README.md && bunx vitest run tests/slackNotify.test.ts tests/slack.edgeCases.test.ts'

## live-prove

- id: live-prove
- deps: worker-deploy, slack-staging
- parallel_group: D
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/live-prove
- branch: pkg/live-prove
- write_paths: looper-homie-staging-live/loop-workspace/live-prove-evidence.md
- ac_command: bash -lc 'test -f looper-homie-staging-live/loop-workspace/live-prove-evidence.md && rg -q "spaces_url|Spaces|status=ok|staging" looper-homie-staging-live/loop-workspace/live-prove-evidence.md'

## docs-close

- id: docs-close
- deps: live-prove
- parallel_group: D
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/docs-close
- branch: pkg/docs-close
- write_paths: docs/workstreams.md, scrapers/facebook/README.md, looper-homie-staging-live/inputs/goal.md
- ac_command: bash -lc 'rg -q homie-runtime-errors-staging docs/workstreams.md scrapers/facebook/README.md && rg -q raw_facebook_posts docs/workstreams.md && rg -q feat/homie-staging-live looper-homie-staging-live/inputs/goal.md'
