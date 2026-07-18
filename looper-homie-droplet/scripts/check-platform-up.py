#!/usr/bin/env python3
"""Assert full platform is up on homie-k3s-droplet (incl. prometheus)."""

from __future__ import annotations

import json
import os
import subprocess
import sys

CONTEXT = os.environ.get("HOMIE_KUBE_CONTEXT", "homie-k3s-droplet")
NAMESPACES = ("monitoring", "argocd", "argo")


def kubectl_json(args: list[str]) -> dict:
    proc = subprocess.run(
        ["kubectl", "--context", CONTEXT, *args, "-o", "json"],
        capture_output=True,
        text=True,
        timeout=45,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or "kubectl failed")
    return json.loads(proc.stdout)


def ready_pods(ns: str) -> list[str]:
    data = kubectl_json(["get", "pods", "-n", ns])
    names: list[str] = []
    for pod in data.get("items", []):
        status = pod.get("status", {})
        conds = {c.get("type"): c.get("status") for c in status.get("conditions", [])}
        if status.get("phase") == "Running" and conds.get("Ready") == "True":
            names.append(pod.get("metadata", {}).get("name", "?"))
    return names


def main() -> int:
    errors: list[str] = []
    all_names: list[str] = []
    for ns in NAMESPACES:
        try:
            names = ready_pods(ns)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{ns}: {exc}")
            continue
        if not names:
            errors.append(f"{ns}: no Ready Running pods")
        else:
            print(f"ok: {ns} has {len(names)} Ready pod(s)")
            all_names.extend(names)

    # Full stack requires prometheus somewhere in monitoring
    if not any("prometheus" in n.lower() for n in all_names):
        errors.append("monitoring: no Ready pod name containing 'prometheus' (full stack required)")

    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
