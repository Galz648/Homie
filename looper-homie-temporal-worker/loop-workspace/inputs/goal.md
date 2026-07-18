# Goal — Temporal worker on Homie k3s

## Outcome
Add the Homie Facebook **Temporal worker** to the k3s cluster **in GitOps YAML** (base + staging overlay), with in-lane Temporal server wiring, secrets/examples, and an image contract — so Argo CD can Sync the desired state.

## Subgoals
1. Temporal server on staging lane YAML (reuse/adapt `scrape-temporal`)
2. Worker Deployment (+ ConfigMap / SA as needed) under `infra/k3s/base/`
3. Wire into `overlays/staging` (production deferred unless trivial)
4. Secrets/examples + `envFrom` (no live secrets in git)
5. Dockerfile + overlay `images:` stub for future build/pin
6. Short change map: CI build→pin follow-ups; pin-skip already on poller

## Done
- `kubectl kustomize infra/k3s/overlays/staging` includes Temporal + worker
- Placeholder image documented; no secrets committed
- `loop-workspace/CHANGE-MAP.md` answers custom image / tag pin / secrets / CI
- Live image build, Playwright cookie mount, production Sync are follow-ups unless packaged

## Anti-goals
- Committing Facebook session / Slack / DB / Spaces secrets
- Making GHA the primary CI path
- Requiring Zot/Kaniko complete in this loop (contract + stub only OK)
- Parallel git worktrees (macOS index lock)
