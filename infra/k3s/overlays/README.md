# Overlays

Kustomize **lanes** — thin patches / namespace per environment over `../base`.

| Overlay | Namespace | Git branch (migrate + Argo) | Host |
|---------|-----------|------------------------------|------|
| `local` | `homie` | `staging` (optional) | k3d on Docker Desktop |
| `staging` | `homie-staging` | `staging` | DO droplet |
| `production` | `homie-production` | `main` | DO droplet |

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

## Database (Postgres)

| Lane | Source of truth | Secret |
|------|-----------------|--------|
| **production** | Supabase (`DATABASE_URL` / `DIRECT_URL` from repo `.env` → `~/.config/homie/database.production.env`) | `homie-database` |
| **staging** | Non-Supabase (in-cluster when provisioned) — `database.staging.env` | `homie-database` |
| **local** | k3d scrape-postgres `127.0.0.1:54329` | n/a |

```bash
# Sync from repo .env once, then apply (production refuses non-Supabase hosts):
KUBECONFIG=~/.kube/homie-k3s.yaml ./scripts/apply-homie-database-secret.sh production
```

Worker / API:

```yaml
envFrom:
  - secretRef:
      name: homie-database
  - secretRef:
      name: homie-spaces-images
```
