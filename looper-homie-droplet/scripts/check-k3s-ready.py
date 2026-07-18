#!/usr/bin/env python3
"""Assert kubectl context homie-k3s-droplet has at least one Ready node."""

from __future__ import annotations

import json
import os
import subprocess
import sys

CONTEXT = os.environ.get("HOMIE_KUBE_CONTEXT", "homie-k3s-droplet")


def main() -> int:
    try:
        proc = subprocess.run(
            ["kubectl", "--context", CONTEXT, "get", "nodes", "-o", "json"],
            capture_output=True,
            text=True,
            timeout=45,
            check=False,
        )
    except FileNotFoundError:
        print("kubectl not found on PATH", file=sys.stderr)
        return 1
    except subprocess.TimeoutExpired:
        print("kubectl timed out", file=sys.stderr)
        return 1

    if proc.returncode != 0:
        print(proc.stderr or proc.stdout or f"kubectl --context {CONTEXT} failed", file=sys.stderr)
        return 1

    data = json.loads(proc.stdout)
    ready = 0
    for node in data.get("items", []):
        for cond in node.get("status", {}).get("conditions", []):
            if cond.get("type") == "Ready" and cond.get("status") == "True":
                ready += 1
    if ready < 1:
        print(f"no Ready nodes on context {CONTEXT}", file=sys.stderr)
        return 1
    print(f"ok: context {CONTEXT} has {ready} Ready node(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
