# Overlays

Kustomize **lanes** — thin patches / namespace per environment over `../base`.

| Overlay | Namespace | Host |
|---------|-----------|------|
| `local` | `homie` | k3d on Docker Desktop |
| `staging` | `homie-staging` | DO droplet (later) |
| `production` | `homie-production` | DO droplet (later) |

Phase 1 overlays only create the Namespace (+ `secrets.example.yaml`).
