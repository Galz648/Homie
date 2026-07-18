# fb-scrape-worker

Homie Facebook **Temporal worker** Deployment for k3s lanes.

| Item | Value |
|------|--------|
| Code | `scrapers/facebook/src/worker.ts` |
| Image | Built from `infra/k3s/docker/Dockerfile.fb-scrape-worker` (custom) |
| Temporal | `TEMPORAL_ADDRESS` → `scrape-temporal:7233` in-namespace |
| DB | Secret `homie-database` (`DATABASE_URL`) — staging/prod out-of-band |
| Spaces | Optional Secret `homie-spaces-images` |
| Session | Mount or Secret later — see CHANGE-MAP; not in this base |

Until the image exists in-cluster, pods will `ImagePullBackOff` after Sync — expected.
