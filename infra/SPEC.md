# Homie infrastructure SPEC

Broader multi-stream roadmap (Slack, DO, app, pre-commit, e2e):  
[`docs/workstreams.md`](../docs/workstreams.md).

## Target shape

Single-node **k3s** for Homie platform services.

| Stage | Cluster |
|-------|---------|
| Now | Local **k3d** on Docker Desktop (`k3d-homie-local`) |
| Later | DigitalOcean droplet + Tailscale (`infra/terraform/stacks/k3s`) — **not applied yet** |

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
| CI plumbing | `homie-ci` ns + WorkflowTemplate stubs + thin GHA | `platform/ci-lane`, `.github/workflows/argo-ci.yml` |

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
3. Argo Workflows — workflow engine + `homie-ci-smoke` template
4. CI lane scaffold + thin `argo-ci.yml` (submit/wait; no real app suites yet)

## Out of scope

- Restoring Alchemy / Cloudflare preview-publish workflows
- Containerizing Homie-Website or Facebook fetchers (fetcher does not exist yet)
- Real Homie unit/e2e suites inside Argo
- `terraform apply` / DigitalOcean create (until explicitly approved)
- clinic domain workloads (WAHA, Temporal, etc.)
- Infisical / External Secrets / Zot (optional later)

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
