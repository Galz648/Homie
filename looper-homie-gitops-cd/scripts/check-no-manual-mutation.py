#!/usr/bin/env python3
"""Fail if PARALLEL-REPORT claims forbidden imperative cluster mutations as the fix."""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Affirmative use only — "never did X" / "do not X" should pass.
FORBIDDEN = [
    r"(?i)(?:used|ran|via|with)\s+kubectl\s+set\s+image",
    r"(?i)kubectl\s+set\s+image\s+\S+",
    r"(?i)kubectl\s+apply\s+-k\s+\S*overlays/(staging|production)",
    r"(?i)kubectl\s+edit\s+deploy",
]


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: check-no-manual-mutation.py PARALLEL-REPORT.md", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"missing report: {path}", file=sys.stderr)
        return 1
    text = path.read_text(encoding="utf-8")
    hits = []
    for pat in FORBIDDEN:
        if re.search(pat, text):
            hits.append(pat)
    if hits:
        print("forbidden manual-mutation claims in report:", hits, file=sys.stderr)
        return 1
    print("ok: no forbidden manual-mutation claims")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
