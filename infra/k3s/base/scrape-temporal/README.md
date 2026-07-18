# scrape-temporal

Temporal auto-setup + DB + UI for Homie scrape workers.

| Overlay | Service type | Notes |
|---------|--------------|--------|
| `local` | LoadBalancer | Host gRPC `127.0.0.1:7233`, UI `8233` (k3d) |
| `staging` | ClusterIP (patched) | In-cluster workers use `scrape-temporal:7233` |

Do not set `DYNAMIC_CONFIG_FILE_PATH` (crashes auto-setup when file missing).

Not a Homie custom image — upstream `temporalio/auto-setup` / `temporalio/ui`.
