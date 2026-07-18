# Homie `infra/` — operator map

Local-first k3s **platform** (monitoring, GitOps, workflows, CI plumbing).
See [SPEC.md](./SPEC.md) for ownership, install-script table, and current status.  
Upcoming workstreams (Slack, DO, app, e2e): [`docs/workstreams.md`](../docs/workstreams.md).

**Local proof (2026-07-18):** `k3d-homie-local` is up; `homie-monitoring`,
`homie-argocd`, and `homie-argo-workflows` are installed.

## Prerequisites (laptop)

| Tool | Notes |
|------|-------|
| Docker Desktop | ≥ ~8 GiB recommended if installing full monitoring |
| `k3d`, `kubectl`, `helm` | |
| `bun` | optional; not required for platform-only |

## Bring up local cluster

```bash
./scripts/k3s-local-up.sh
kubectl config use-context k3d-homie-local
kubectl get nodes
```

Lane namespaces + local scrape e2e (Postgres + Temporal in `homie`):

```bash
kubectl apply -k infra/k3s/overlays/local
kubectl -n homie rollout status deploy/scrape-postgres --timeout=120s
kubectl -n homie rollout status deploy/scrape-temporal --timeout=180s
```

Host ports (k3d loadbalancer, set by `k3s-local-up.sh`):

| Service | Host |
|---------|------|
| scrape Postgres | `127.0.0.1:54329` |
| Temporal gRPC | `127.0.0.1:7233` |
| Temporal UI | `127.0.0.1:8233` |

```bash
# schema (Drizzle-only)
DATABASE_URL=postgresql://homie:homie@127.0.0.1:54329/homie bun scripts/local-db/migrate.ts
# AC runners (from scrapers/facebook)
cd scrapers/facebook && bun run check:postgres && bun run check:temporal
```

Do **not** use Docker Compose for scrape e2e Postgres/Temporal — k3s owns those.
## Install platform packs (order)

```bash
cd infra/k3s/monitoring && ./install.sh --wait --timeout 15m
cd ../argocd && ./install.sh --wait --timeout 10m
cd ../platform/argo-workflows && ./install.sh --wait --timeout 10m
kubectl -n argo apply -f templates/homie-ci-smoke.yaml
```

Lite monitoring if RAM is tight:

```bash
./infra/k3s/monitoring/install-lite.sh
```

## Port-forwards

```bash
kubectl -n monitoring port-forward svc/homie-monitoring-grafana 3000:80
kubectl -n argocd port-forward svc/homie-argocd-server 8080:80
kubectl -n argo port-forward svc/homie-argo-workflows-server 2746:2746
```

## CI

- Templates: `infra/k3s/platform/argo-workflows/templates/`
- Smoke: `kubectl -n argo create -f infra/k3s/platform/argo-workflows/examples/from-template-ci-smoke.yaml`
- Thin GHA: `.github/workflows/argo-ci.yml` (needs `HOMIE_K3S_KUBECONFIG` for remote; `workflow_dispatch` otherwise)

## DigitalOcean (later — do not apply yet)

```bash
cd infra/terraform/stacks/k3s
# cp examples → local tfvars / backend.hcl, then plan/apply with operator approval
```

## Slack

See `infra/k3s/monitoring/README-slack.md` and `infra/k3s/argocd/README-slack.md`.
Secrets stay out of git (`~/.config/homie/` recommended).
