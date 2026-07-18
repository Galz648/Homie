# Goal — Homie DO Spaces + raw FB post image upload

## Outcome

Homie can store scraped Facebook post photos in **two DigitalOcean Spaces buckets**
(staging + production), wired through Terraform/`tfvars`, with the Facebook
Temporal scrape activity able to **upload images** (`HOMIE_IMAGE_UPLOAD_MODE=spaces`)
into `raw_facebook_posts.images`, proven with a **manual one-image smoke**.

Root git branch (fork + merge target): **`feat/homie-spaces-images`** (created
from `infra`). Package worktrees live under
`/Users/galzafar/Documents/GitHub/homie-worktrees/`. Package branches use
`pkg/<id>` (git cannot nest under `feat/homie-spaces-images/...` while that
branch exists).

## Repo

`/Users/galzafar/Documents/GitHub/Homie`

## Context (must read)

- `docs/workstreams.md` — W3.1 / W4.2b Spaces agreement; `raw_facebook_posts.images`
- `scrapers/facebook/src/pipeline/images.ts` — `noop` (default) or `spaces` PutObject
- `scrapers/facebook/src/activities.ts` — `scrapeFacebookGroupFeed` loads `spaces.env`
- `infra/terraform/stacks/k3s/` — Spaces buckets (this loop) + droplet/volumes
- Local vs DO: local uses `emptyDir` + image `noop` (FB CDN URLs); Spaces is
  for staging/prod blobs whose URLs land in Postgres

## Agreed env contract (packages must honor)

| Env | Meaning |
|-----|---------|
| `HOMIE_IMAGE_UPLOAD_MODE` | `noop` (default) \| `spaces` |
| `HOMIE_IMAGES_BUCKET` | Spaces bucket name for this env |
| `HOMIE_IMAGES_BASE_URL` | Public/CDN base for persisted URLs |
| `HOMIE_SPACES_ENDPOINT` | e.g. `https://fra1.digitaloceanspaces.com` |
| `HOMIE_SPACES_REGION` | e.g. `fra1` |
| `HOMIE_SPACES_KEY` / `HOMIE_SPACES_SECRET` | Spaces access key (out of band; never commit) |

`raw_facebook_posts.images` stores **full Spaces URLs** (or keys resolved via
`HOMIE_IMAGES_BASE_URL`) — not block-volume paths.

## Suggested packages (disjoint write_paths)

| id | parallel_group | write_paths (sketch) | AC sketch |
|----|----------------|----------------------|-----------|
| `spaces-tf` | A | `infra/terraform/stacks/k3s/spaces.tf`, `variables.tf`, `outputs.tf`, `*.tfvars.example`, `README.md` | `terraform fmt -check` + files exist + example tfvars document both buckets |
| `images-upload` | A | `scrapers/facebook/src/pipeline/images.ts`, related tests, smoke script, `package.json` if deps | vitest covers spaces path (mocked S3); smoke script uploads one fixture when creds present |
| `spaces-docs` | A | `docs/workstreams.md`, `infra/README.md` and/or `scrapers/facebook/README.md` | docs mention two buckets + env contract + noop vs spaces |

Refine in `plan.md` with exact paths; keep same-group paths disjoint.

## Done when

1. TF defines staging + production Spaces buckets; examples show how tfvars
   select/name them (no real secrets committed).
2. Scrape `persistListingImages` implements Spaces upload when mode=`spaces`
   (called from Temporal activity upsert path).
3. Manual one-image smoke documented/scripted and run successfully at least once
   by the operator (or AC records skip-with-reason if no Spaces creds in env —
   prefer a real upload when keys exist in `~/.config/homie/`).
4. All packages merged into `feat/homie-spaces-images`; worktrees removed;
   `PARALLEL-REPORT.md` complete.

## Anti-goals

- Committing Spaces keys, `secrets.auto.tfvars`, or filled secrets
- Using droplet **block** volumes as photo storage
- Making Spaces required for local mocks e2e (noop stays default)
- Force-pushing `feat/homie-spaces-images` or `infra`
- Big-bang rewrite of scrape pipeline unrelated to images
