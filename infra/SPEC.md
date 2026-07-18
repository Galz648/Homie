# Homie infrastructure SPEC

Broader multi-stream roadmap (Slack, DO, app, pre-commit, e2e):  
[`docs/workstreams.md`](../docs/workstreams.md).

## Target shape

Single-node **k3s** for Homie platform services.

| Stage | Cluster |
|-------|---------|
| Local | **k3d** on Docker Desktop (`k3d-homie-local`) when present |
| Droplet | DigitalOcean k3s (`homie-k3s`) — **live**; primary CI + GitOps target |

Product application code (Homie-Website, scrapers) is **out of scope** for phase 1.
Cloudflare / Alchemy deploy on branch `infra` is **retired**.

## Current status (local)

Proven on Docker Desktop / k3d (2026-07-18):

| Step | Command / artifact | Result |
|------|-------------------|--------|
| Cluster | `./scripts/k3s-local-up.sh` | Context `k3d-homie-local`, node Ready |
| Monitoring | `infra/k3s/monitoring/install.sh` | Release `homie-monitoring` in ns `monitoring` |
| Argo CD | `infra/k3s/argocd/install.sh` | Release `homie-argocd` in ns `argocd` |
| Argo Workflows | `infra/k3s/platform/argo-workflows/install.sh` | Release `homie-argo-workflows` in ns `argo` |
| CI template | `kubectl apply -f …/templates/homie-ci-smoke.yaml` | WorkflowTemplate present |

DigitalOcean / `terraform apply` not done.

## Install scripts

Homie-named Helm wrappers (need `helm`, `kubectl`, and a Ready cluster context). Extra argv are forwarded to `helm upgrade --install` (e.g. `--wait --timeout 15m`).

| Script | What it installs | Namespace | Default release |
|--------|------------------|-----------|-----------------|
| [`k3s/monitoring/install.sh`](./k3s/monitoring/install.sh) | Prometheus + Grafana + Loki + Alloy | `monitoring` | `homie-monitoring` |
| [`k3s/argocd/install.sh`](./k3s/argocd/install.sh) | Argo CD | `argocd` | `homie-argocd` |
| [`k3s/platform/argo-workflows/install.sh`](./k3s/platform/argo-workflows/install.sh) | Argo Workflows | `argo` | `homie-argo-workflows` |

Optional: [`k3s/monitoring/install-lite.sh`](./k3s/monitoring/install-lite.sh) — logs-only stack when Docker RAM is tight.

These install **platform** services only — not Homie-Website or product workloads.

## Ownership

| Layer | Owns | Path |
|-------|------|------|
| Terraform | VM, firewall, block volumes, cloud-init | `infra/terraform/stacks/k3s/` |
| Kustomize | Lane namespaces / future app workloads | `infra/k3s/base`, `overlays/*` |
| Helm `install.sh` | Monitoring, Argo CD, Argo Workflows | `infra/k3s/monitoring`, `argocd`, `platform/argo-workflows` |
| Argo CD | Git → cluster sync (manual Sync) | `infra/k3s/argocd/applications/` |
| CI (primary) | Poller + `homie-ci-staging` on droplet | `platform/argo-workflows`, `platform/ci-lane` |
| CI (secondary) | Thin GHA submit/wait only | `.github/workflows/argo-ci.yml` |

## Lanes

| Overlay | Namespace |
|---------|-----------|
| `local` | `homie` |
| `staging` | `homie-staging` |
| `production` | `homie-production` |
| CI lane | `homie-ci` |

## Platform scope

Phase 1 includes:

1. Monitoring — Prometheus + Grafana + Loki + Alloy (+ Slack docs/examples)
2. Argo CD — GitOps controller + Homie Application stubs
3. Argo Workflows — primary CI (`homie-ci-staging-poll` → mock e2e)
4. Argo CD Applications — manual Sync of overlays/monitoring from `staging`
5. Image build / Zot / overlay pin — **live** on droplet (Kaniko → Zot →
   `chore(k3s): pin*` → Argo Sync). Verify with `scripts/k3s/assert-worker-pin.sh`.
   Never `kubectl set image` (see `.cursor/rules/no-manual-cluster-mutation.mdc`).
6. Manual scrape trigger — WorkflowTemplate `homie-trigger-scrape` (exec into
   Temporal; no admin-tools pull)

## Out of scope (for now)

- Restoring Alchemy / Cloudflare preview-publish workflows
- Containerizing Homie-Website (FB scrape worker image is live via Zot)
- GHA as primary CI submit path (`HOMIE_K3S_KUBECONFIG`)
- Infisical / External Secrets (optional later)
- clinic domain workloads (WAHA, clinic Temporal, etc.)

**CD loop (staging):** tip → `homie-ci-staging` → `homie-build-images` → pin
commit → Argo Sync → `assert-worker-pin.sh`. Trigger live scrape via
`examples/ci-trigger-scrape.yaml` (not ad-hoc admin-tools pods).

**In scope for W6a-e2e (local overlay):** scrape Postgres + Temporal Deployments in `homie` ns (`infra/k3s/base/scrape-postgres`, `scrape-temporal`), exposed on the host via k3d LB ports `54329` / `7233` / `8233`.

## IaC-first

- Non-secrets: ConfigMaps / values in git
- Secrets: `*.example.yaml` / `*.tfvars.example` only; apply out-of-band
- Never treat one-off `kubectl set env` or Dashboard edits as source of truth

## Success criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `infra/SPEC.md` + `infra/README.md` present | met |
| 2 | Tree + Homie-named packs + CI plumbing present | met |
| 3 | Local k3d node Ready | met (`k3d-homie-local`) |
| 4 | Three Homie `install.sh` deploy cleanly | met |
| 5 | Pods Ready in `monitoring`, `argocd`, `argo` | met |
| 6 | Operator signoff — no DO apply performed | pending |
