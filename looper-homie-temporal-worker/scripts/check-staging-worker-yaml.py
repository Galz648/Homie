#!/usr/bin/env python3
"""Fail unless staging kustomize includes Temporal + fb-scrape-worker."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OVERLAY = ROOT / "infra/k3s/overlays/staging"


def main() -> int:
    r = subprocess.run(
        ["kubectl", "kustomize", str(OVERLAY)],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        sys.stderr.write(r.stderr or r.stdout)
        return r.returncode
    out = r.stdout
    need = [
        "name: scrape-temporal",
        "name: fb-scrape-worker",
        "kind: Deployment",
    ]
    missing = [n for n in need if n not in out]
    if missing:
        print("missing in staging kustomize:", missing, file=sys.stderr)
        return 1
    if "TEMPORAL_ADDRESS" not in out:
        print("worker env TEMPORAL_ADDRESS missing", file=sys.stderr)
        return 1
    print("ok: staging kustomize has Temporal + fb-scrape-worker")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
