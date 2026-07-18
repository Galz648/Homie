# Delivery 1 — Temporal worker YAML on staging

## Packages completed
| id | Result |
|----|--------|
| pkg-temporal-staging | staging includes scrape-temporal; ClusterIP patch |
| pkg-worker-yaml | `base/fb-scrape-worker` Deployment + ConfigMap; secrets.example |
| pkg-image-stub | Dockerfile + overlay `images:` → zot stub `staging` |
| pkg-change-map | `CHANGE-MAP.md` + base README |

## Evidence
- `python3 scripts/check-staging-worker-yaml.py` (from looper dir / repo root)
- `python3 scripts/check-change-map.py loop-workspace/CHANGE-MAP.md`

## Operator notes
- Do not Sync expecting Running worker until custom image exists.
- `homie-database` Secret required (non-optional) on the Deployment.
