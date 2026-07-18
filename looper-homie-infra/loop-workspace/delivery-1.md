# Delivery 1 — scaffold + CF retire

## Changes

- Branch `infra` from `main`
- Removed Cloudflare/Alchemy deploy infra (workflows, `alchemy.run.ts`, CF vite plugin/deps)
- Added `infra/` SPEC, README, TF stub, overlays, monitoring/argocd/argo-workflows (Homie-named)
- Added CI plumbing: `platform/ci-lane`, `homie-ci-smoke`, `.github/workflows/argo-ci.yml`
- Added `scripts/k3s-local-up.sh` + looper plan/checks

## Not done yet

- k3d create + helm installs (needs operator approval)
- terraform apply (out of scope)
