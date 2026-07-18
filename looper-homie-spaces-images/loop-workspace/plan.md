# Parallel plan — Homie Spaces + image upload

Root branch: `feat/homie-spaces-images`  
Worktree root: `/Users/galzafar/Documents/GitHub/homie-worktrees`  
Package branches: `pkg/<id>` (not nested under feat/…)

## spaces-tf

- id: spaces-tf
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/spaces-tf
- branch: pkg/spaces-tf
- write_paths: infra/terraform/stacks/k3s/spaces.tf, infra/terraform/stacks/k3s/variables.tf, infra/terraform/stacks/k3s/outputs.tf, infra/terraform/stacks/k3s/terraform.tfvars.example, infra/terraform/stacks/k3s/README.md
- ac_command: bash -lc 'cd infra/terraform/stacks/k3s && test -f spaces.tf && grep -q staging spaces.tf && grep -q production spaces.tf && grep -q images_bucket terraform.tfvars.example && grep -q HOMIE_IMAGES_BUCKET README.md && grep -q spaces_images outputs.tf && terraform fmt -check -recursive .'

**AC detail:** Two Spaces buckets (staging + production) in TF; tfvars.example documents naming; README states env contract for app (`HOMIE_IMAGES_BUCKET` etc.); outputs expose bucket names; no secrets in git.

## images-upload

- id: images-upload
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/images-upload
- branch: pkg/images-upload
- write_paths: scrapers/facebook/src/pipeline/images.ts, scrapers/facebook/tests/images.test.ts, scrapers/facebook/scripts/smokeSpacesUpload.ts, scrapers/facebook/package.json, scrapers/facebook/fixtures/smoke-pixel.png
- write_paths_note: bun.lock may update with package.json — allowed for this package only
- ac_command: bash -lc 'cd scrapers/facebook && test -f src/pipeline/images.ts && test -f scripts/smokeSpacesUpload.ts && test -f fixtures/smoke-pixel.png && grep -q PutObjectCommand src/pipeline/images.ts && ! grep -q "not implemented yet" src/pipeline/images.ts && bun install && bunx vitest run tests/images.test.ts && bun run typecheck'

**AC detail:** `HOMIE_IMAGE_UPLOAD_MODE=spaces` uploads via S3-compatible Spaces client; `noop` unchanged default; unit tests mock/assert URL shape; smoke script exists for one-image manual run (`bun run smoke:spaces-upload`).

## spaces-docs

- id: spaces-docs
- deps: none
- parallel_group: A
- worktree: /Users/galzafar/Documents/GitHub/homie-worktrees/spaces-docs
- branch: pkg/spaces-docs
- write_paths: docs/workstreams.md, scrapers/facebook/README.md
- ac_command: bash -lc 'grep -q HOMIE_IMAGES_BUCKET docs/workstreams.md && grep -q "Spaces" docs/workstreams.md && grep -q HOMIE_IMAGE_UPLOAD_MODE scrapers/facebook/README.md && grep -q smoke:spaces-upload scrapers/facebook/README.md'

**AC detail:** W3/W4 Spaces tasks updated; facebook README documents noop vs spaces + smoke command.

## Merge protocol

1. AC pass in package worktree  
2. Commit on `pkg/<id>`  
3. Merge into `feat/homie-spaces-images` (from root worktree or main repo)  
4. `git worktree remove` package worktree  
5. Record in PARALLEL-REPORT.md  

Never force-push. Never commit Spaces keys.
