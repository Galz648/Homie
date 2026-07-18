# scrape-temporal

Local Temporal auto-setup + DB + UI for Homie scrape e2e.

Host: gRPC `127.0.0.1:7233`, UI `127.0.0.1:8233` (k3d LB).
Do not set `DYNAMIC_CONFIG_FILE_PATH` (crashes auto-setup when file missing).
