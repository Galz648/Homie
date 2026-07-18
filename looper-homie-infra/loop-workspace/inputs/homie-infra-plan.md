# Homie infra skeleton (seed plan)

Source: Cursor plan `homie_infra_skeleton` (2026-07-18), narrowed for this loop.

## Goal

Homie-named `infra/` tree for **local k3s platform only** (Docker Desktop / k3d):

```text
infra/
  SPEC.md
  README.md
  terraform/stacks/k3s/     # stub only — do not apply in this loop
  k3s/
    base/                   # stub README (no app workloads)
    overlays/{local,staging,production}/
    monitoring/
    argocd/
    platform/argo-workflows/
```

## Ownership

- Terraform = host (later DO); not applied now
- Kustomize overlays = lane namespaces (stubs)
- Helm `install.sh` = monitoring, Argo CD, Argo Workflows
- Argo CD = git→cluster sync (manual Sync); Applications stubbed

## Lanes

- local → ns `homie`
- staging → ns `homie-staging`
- production → ns `homie-production`

## Phase 1 platform + CI

Monitoring (+ Slack docs/examples), Argo CD, Argo Workflows, `platform/ci-lane`
(`homie-ci` ns scaffold), Homie WorkflowTemplate stubs, thin
`.github/workflows/argo-ci.yml` (submit/wait — no real app suites yet).

Cloudflare / Alchemy deploy + Homie-Website GHA preview/publish are **retired**
on branch `infra`.

## Out of scope (this loop)

- Restoring Alchemy/CF deploy
- Containerizing Homie-Website / Facebook scraper
- Real Homie app test suites in Argo
- `terraform apply` / DigitalOcean create
- clinic domain workloads

## Success

Local k3d Ready; three Homie `install.sh` installs; pods Ready in `monitoring`,
`argocd`, `argo`; ci-lane + argo-ci.yml + WorkflowTemplate stubs present.
