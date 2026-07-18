#!/usr/bin/env python3
"""Assert platform install.sh scripts exist, are executable, and Homie-defaulted."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = [
    (ROOT / "infra" / "k3s" / "monitoring" / "install.sh", "homie-monitoring"),
    (ROOT / "infra" / "k3s" / "argocd" / "install.sh", "homie-argocd"),
    (
        ROOT / "infra" / "k3s" / "platform" / "argo-workflows" / "install.sh",
        "homie-argo-workflows",
    ),
]


def main() -> int:
    errors: list[str] = []
    for path, release in SCRIPTS:
        if not path.is_file():
            errors.append(f"missing {path.relative_to(ROOT)}")
            continue
        if not os.access(path, os.X_OK):
            errors.append(f"not executable: {path.relative_to(ROOT)}")
        text = path.read_text()
        if release not in text:
            errors.append(f"{path.relative_to(ROOT)} missing default {release}")
        if "helm upgrade --install" not in text:
            errors.append(f"{path.relative_to(ROOT)} missing helm upgrade --install")
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print("ok: three Homie install.sh scripts present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
