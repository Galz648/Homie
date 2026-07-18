#!/usr/bin/env python3
"""Assert monitoring, argocd, and argo namespaces have at least one Ready pod each."""

from __future__ import annotations

import json
import subprocess
import sys

NAMESPACES = ("monitoring", "argocd", "argo")


def ready_pods(ns: str) -> int:
    proc = subprocess.run(
        ["kubectl", "get", "pods", "-n", ns, "-o", "json"],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or f"kubectl get pods -n {ns} failed")
    data = json.loads(proc.stdout)
    count = 0
    for pod in data.get("items", []):
        status = pod.get("status", {})
        phase = status.get("phase")
        conds = {c.get("type"): c.get("status") for c in status.get("conditions", [])}
        if phase == "Running" and conds.get("Ready") == "True":
            count += 1
            continue
        # Completed jobs don't count; need Running Ready
    return count


def main() -> int:
    try:
        subprocess.run(["kubectl", "version", "--client"], capture_output=True, check=False)
    except FileNotFoundError:
        print("kubectl not found on PATH", file=sys.stderr)
        return 1

    errors: list[str] = []
    for ns in NAMESPACES:
        try:
            n = ready_pods(ns)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{ns}: {exc}")
            continue
        if n < 1:
            errors.append(f"{ns}: no Ready Running pods")
        else:
            print(f"ok: {ns} has {n} Ready pod(s)")
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
