#!/usr/bin/env python3
"""Assert Homie CI plumbing: ci-lane, WorkflowTemplate stubs, argo-ci.yml."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REQUIRED = [
    ROOT / "infra" / "k3s" / "platform" / "ci-lane" / "namespace.yaml",
    ROOT / "infra" / "k3s" / "platform" / "ci-lane" / "kustomization.yaml",
    ROOT / "infra" / "k3s" / "platform" / "ci-lane" / "README.md",
    ROOT
    / "infra"
    / "k3s"
    / "platform"
    / "argo-workflows"
    / "templates"
    / "homie-ci-smoke.yaml",
    ROOT / ".github" / "workflows" / "argo-ci.yml",
]


def main() -> int:
    missing = [str(p.relative_to(ROOT)) for p in REQUIRED if not p.exists()]
    if missing:
        print("missing CI plumbing:", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        return 1
    argo = (ROOT / ".github" / "workflows" / "argo-ci.yml").read_text()
    if "homie" not in argo.lower() and "Homie" not in argo:
        print("argo-ci.yml should mention Homie", file=sys.stderr)
        return 1
    if "clinic-" in argo:
        print("argo-ci.yml still has clinic- residue", file=sys.stderr)
        return 1
    print("ok: CI plumbing present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
