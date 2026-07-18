#!/usr/bin/env python3
"""Assert required Homie infra/ paths exist."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REQUIRED = [
    ROOT / "infra" / "SPEC.md",
    ROOT / "infra" / "README.md",
    ROOT / "infra" / "terraform" / "stacks" / "k3s" / "README.md",
    ROOT / "infra" / "k3s" / "base" / "README.md",
    ROOT / "infra" / "k3s" / "overlays" / "local" / "kustomization.yaml",
    ROOT / "infra" / "k3s" / "overlays" / "staging" / "kustomization.yaml",
    ROOT / "infra" / "k3s" / "overlays" / "production" / "kustomization.yaml",
    ROOT / "infra" / "k3s" / "monitoring" / "install.sh",
    ROOT / "infra" / "k3s" / "argocd" / "install.sh",
    ROOT / "infra" / "k3s" / "platform" / "argo-workflows" / "install.sh",
    ROOT / "infra" / "k3s" / "platform" / "ci-lane" / "kustomization.yaml",
    ROOT / ".github" / "workflows" / "argo-ci.yml",
]


def main() -> int:
    missing = [str(p.relative_to(ROOT)) for p in REQUIRED if not p.exists()]
    if missing:
        print("missing paths:", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        return 1
    print(f"ok: {len(REQUIRED)} required infra paths present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
