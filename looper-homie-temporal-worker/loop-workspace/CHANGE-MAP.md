# Change map — Temporal worker on Homie k3s

## Custom image
**Yes.** The Temporal *server* uses upstream images. The Homie **worker** (`scrapers/facebook` → `worker.ts`) needs a custom image from `infra/k3s/docker/Dockerfile.fb-scrape-worker` (Node 22 + tsx). Playwright browsers are a follow-up layer for live scrape in-cluster.

## Pin (image tags)
**Yes, once builds exist.** Overlay already has:

```yaml
images:
  - name: fb-scrape-worker
    newName: zot.local:5000/homie/fb-scrape-worker
    newTag: staging
```

Future `homie-build-images` Workflow should push `staging-<sha>` and commit `chore(k3s): pin …`. Poller already skips pin-only tips. **Not built in this loop** (no Zot/Kaniko yet).

## Secrets
| Secret | Purpose | In git? |
|--------|---------|---------|
| `homie-database` | `DATABASE_URL` / `DIRECT_URL` | example only |
| `homie-spaces-images` | Spaces upload | example only; optional on Deployment |
| `facebook-session` | Playwright state file | example only; optional volume |

Apply out-of-band before expecting a healthy worker.

## CI
Primary remains **poller → `homie-ci-staging` (mock e2e)**. Image build/pin is a later Workflow alongside CI (Clinica shape). GHA stays secondary.

## YAML delivered this loop
- `infra/k3s/base/fb-scrape-worker/`
- staging overlay: Temporal + worker + ClusterIP patch + `images:` stub
- `infra/k3s/docker/Dockerfile.fb-scrape-worker`
- `overlays/staging/secrets.example.yaml`

## Follow-ups (explicit, not TBD blockers)
1. Install Zot + wire registry; Kaniko build template  
2. Pin Workflow + Argo Sync  
3. Playwright deps in image; non-optional session Secret for live scrape  
4. Production overlay worker + Supabase `homie-database`  
5. Operator Sync of `homie-workloads` when ready to pull (expect ImagePullBackOff until image exists)
