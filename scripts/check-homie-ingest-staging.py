#!/usr/bin/env python3
"""AC: staging homie-ingest Deploy ready + healthz reachable."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

KUBECONFIG = os.environ.get("KUBECONFIG", os.path.expanduser("~/.kube/homie-k3s.yaml"))
NS = "homie-staging"


def sh(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        check=False,
        capture_output=True,
        text=True,
        env={**os.environ, "KUBECONFIG": KUBECONFIG},
    )


def main() -> int:
    r = sh(
        [
            "kubectl",
            "-n",
            NS,
            "get",
            "deploy",
            "homie-ingest",
            "-o",
            "json",
        ]
    )
    if r.returncode != 0:
        print(r.stderr.strip() or "homie-ingest deploy missing", file=sys.stderr)
        return 1
    d = json.loads(r.stdout)
    ready = (
        d.get("status", {}).get("readyReplicas")
        or 0
    )
    if int(ready) < 1:
        print(f"homie-ingest not ready (readyReplicas={ready})", file=sys.stderr)
        return 1

    # Prefer HOMIE_INGEST_URL from env file; fall back to localhost port-forward expectation
    url = os.environ.get("HOMIE_INGEST_URL", "").rstrip("/")
    if not url:
        env_path = os.path.expanduser("~/.config/homie/ingest.env")
        if os.path.isfile(env_path):
            for line in open(env_path, encoding="utf-8"):
                line = line.strip()
                if line.startswith("HOMIE_INGEST_URL="):
                    url = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    if not url:
        print("HOMIE_INGEST_URL unset", file=sys.stderr)
        return 1

    health = f"{url}/healthz"
    try:
        with urllib.request.urlopen(health, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            if resp.status != 200 or '"ok"' not in body.replace(" ", ""):
                # allow {"ok": true}
                if resp.status != 200:
                    print(f"healthz status {resp.status}", file=sys.stderr)
                    return 1
    except urllib.error.URLError as e:
        print(f"healthz unreachable at configured HOMIE_INGEST_URL: {e}", file=sys.stderr)
        return 1

    print("ok: homie-ingest ready and healthz reachable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
