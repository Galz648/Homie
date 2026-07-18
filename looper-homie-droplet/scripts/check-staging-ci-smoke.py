#!/usr/bin/env python3
"""Assert a homie-ci-staging Workflow reached Succeeded on the droplet."""

from __future__ import annotations

import json
import os
import subprocess
import sys

CONTEXT = os.environ.get("HOMIE_KUBE_CONTEXT", "homie-k3s-droplet")


def main() -> int:
    proc = subprocess.run(
        [
            "kubectl",
            "--context",
            CONTEXT,
            "get",
            "workflows.argoproj.io",
            "-n",
            "argo",
            "-o",
            "json",
        ],
        capture_output=True,
        text=True,
        timeout=45,
        check=False,
    )
    if proc.returncode != 0:
        print(proc.stderr or "kubectl get workflows failed", file=sys.stderr)
        return 1

    data = json.loads(proc.stdout or "{}")
    succeeded = []
    for wf in data.get("items", []):
        name = wf.get("metadata", {}).get("name", "")
        labels = wf.get("metadata", {}).get("labels", {}) or {}
        phase = (wf.get("status", {}) or {}).get("phase")
        template = (wf.get("spec", {}) or {}).get("workflowTemplateRef", {}) or {}
        tname = template.get("name", "")
        looks_staging = (
            "staging" in name
            or "homie-ci-staging" in tname
            or labels.get("homie.io/smoke") == "ci-staging"
            or labels.get("homie.io/trigger") == "staging-poll"
        )
        if looks_staging and phase == "Succeeded":
            succeeded.append(name)

    if not succeeded:
        print("no Succeeded staging CI Workflow found in argo ns", file=sys.stderr)
        return 1
    print(f"ok: succeeded staging CI workflows: {succeeded}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
