# Locked goal — Homie DO droplet loop (2026-07-18)

## Decisions

| Decision | Choice |
|----------|--------|
| Droplet size | `s-4vcpu-8gb` (`fra1`, name `homie-k3s`) |
| Monitoring | **Full** — Prometheus + Grafana + Loki + Alloy |
| CI model | **Pull** — 1m CronJob polls GitHub `staging` tip |
| CI suite | `homie-ci-staging` with **facebook-mock** (clinic structure) |
| GHA kubeconfig | **Not** primary CI (`HOMIE_K3S_KUBECONFIG` not required for submit) |
| End state | Droplet **left running**; teardown documented only |
| DO project | Homie `3ff485b0-8b3e-4f09-8798-079d56ecc498` |
| kubectl | `~/.kube/homie-k3s.yaml` → context `homie-k3s-droplet` |

## Clinic structure to adapt

- `deploy/k3s/base/{clinica,waha}-mock` → `infra/k3s/base/facebook-mock`
- `clinic-ci-precommit-cluster` → `homie-ci-staging` (mock Facebook, not live FB)
- `ci-staging-poll-cronjob.yaml` → Homie-named CronJob on branch `staging`
- Secret `argo/github-ci-read` (read-only PAT) out of band

## Anti-goals

No clinic droplet/Slack reuse; no secret commits; no terraform apply without plan approval; no real Facebook scraper product build in this loop (mock + CI shape only).
