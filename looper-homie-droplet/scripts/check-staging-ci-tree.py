#!/usr/bin/env python3
"""Assert clinic-shaped staging CI tree exists under Homie infra/."""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
REQUIRED = [
    REPO / "infra/k3s/base/facebook-mock",
    REPO / "infra/k3s/platform/argo-workflows/templates/homie-ci-staging.yaml",
    REPO / "infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml",
]


def main() -> int:
    missing = [str(p.relative_to(REPO)) for p in REQUIRED if not p.exists()]
    # facebook-mock may be a dir with kustomization
    fb = REPO / "infra/k3s/base/facebook-mock"
    if fb.is_dir() and not any(fb.iterdir()):
        missing.append("infra/k3s/base/facebook-mock (empty)")
    if missing:
        print("missing:\n  " + "\n  ".join(missing), file=sys.stderr)
        return 1
    print("ok: staging CI tree present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
