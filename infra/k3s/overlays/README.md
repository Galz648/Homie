# Overlays

Kustomize **lanes** — thin patches / namespace per environment over `../base`.

| Overlay | Namespace | Host |
|---------|-----------|------|
| `local` | `homie` | k3d on Docker Desktop |
| `staging` | `homie-staging` | DO droplet (later) |
| `production` | `homie-production` | DO droplet (later) |

Phase 1 overlays only create the Namespace (+ `secrets.example.yaml`).

## Spaces images (listing photos)

Per-lane Secret `homie-spaces-images` (staging → staging bucket, production →
production bucket). Apply out of band — never commit real keys:

```bash
KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-spaces-secret.sh staging
KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-spaces-secret.sh production
```

Sources: `~/.config/homie/spaces.staging.env` / `spaces.production.env`
(Homie-only Spaces key `homie-images`, scoped to both image buckets).

When the Facebook scrape worker is deployed, mount via:

```yaml
envFrom:
  - secretRef:
      name: homie-spaces-images
```
