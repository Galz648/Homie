#!/usr/bin/env python3
"""Assert kubectl sees at least one Ready node (local k3d/k3s)."""

from __future__ import annotations

import json
import subprocess
import sys


def main() -> int:
    try:
        proc = subprocess.run(
            ["kubectl", "get", "nodes", "-o", "json"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except FileNotFoundError:
        print("kubectl not found on PATH", file=sys.stderr)
        return 1
    except subprocess.TimeoutExpired:
        print("kubectl timed out", file=sys.stderr)
        return 1

    if proc.returncode != 0:
        print(proc.stderr or proc.stdout or "kubectl get nodes failed", file=sys.stderr)
        return 1

    data = json.loads(proc.stdout)
    ready = 0
    for node in data.get("items", []):
        for cond in node.get("status", {}).get("conditions", []):
            if cond.get("type") == "Ready" and cond.get("status") == "True":
                ready += 1
    if ready < 1:
        print("no Ready nodes", file=sys.stderr)
        return 1
    print(f"ok: {ready} Ready node(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
