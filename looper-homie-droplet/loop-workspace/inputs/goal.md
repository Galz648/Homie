# Goal — Homie DO k3s droplet (parallel packages)

## Outcome

Homie has a DigitalOcean single-node k3s droplet (`s-4vcpu-8gb`, `fra1`,
`homie-k3s`) under project Homie, with full monitoring, Argo CD, Argo
Workflows, and clinic-shaped staging CI: `facebook-mock` + `homie-ci-staging`
+ 1m poll of GitHub branch `staging` (pull model, no GHA kubeconfig CI).

## Done when

- Disjoint packages merged onto `feat/homie-do-droplet`
- Droplet Ready; full monitoring (prometheus) + argocd + argo up
- Staging poller / staging CI Workflow Succeeded against facebook-mock
- Droplet left running; secrets never committed

## Anti-goals

- Clinic droplet / Slack reuse
- `HOMIE_K3S_KUBECONFIG` as primary CI submit
- Lite-only monitoring
- Real Facebook scraper product (mock + CI shape only)
- terraform apply without plan approval
- Force-push root branch; leave package worktrees after merge
