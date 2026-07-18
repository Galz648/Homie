#!/usr/bin/env python3
"""Fail if Homie platform packs still use clinic-* release defaults."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKS = [
    ROOT / "infra" / "k3s" / "monitoring",
    ROOT / "infra" / "k3s" / "argocd",
    ROOT / "infra" / "k3s" / "platform" / "argo-workflows",
]
FORBIDDEN = re.compile(
    r"^(?:RELEASE|name)\s*[:=].*clinic|"
    r'RELEASE="\$\{RELEASE:-clinic|'
    r"name:\s*clinic-",
    re.MULTILINE,
)


def main() -> int:
    errors: list[str] = []
    for pack in PACKS:
        if not pack.is_dir():
            errors.append(f"missing pack dir {pack}")
            continue
        for path in pack.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix in {".tgz"} or "charts" in path.parts:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if FORBIDDEN.search(text):
                errors.append(f"clinic release/name residue in {path.relative_to(ROOT)}")
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1

    for rel, needle in [
        ("infra/k3s/monitoring/install.sh", "homie-monitoring"),
        ("infra/k3s/argocd/install.sh", "homie-argocd"),
        ("infra/k3s/platform/argo-workflows/install.sh", "homie-argo-workflows"),
    ]:
        path = ROOT / rel
        if not path.is_file() or needle not in path.read_text():
            print(f"expected {needle} default in {rel}", file=sys.stderr)
            return 1

    print("ok: Homie-named release defaults; no clinic-* release residue")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
