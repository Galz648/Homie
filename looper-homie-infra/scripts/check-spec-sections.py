#!/usr/bin/env python3
"""Assert infra/SPEC.md has required section headings."""

from __future__ import annotations

import pathlib
import re
import sys

SPEC = pathlib.Path(__file__).resolve().parents[2] / "infra" / "SPEC.md"
REQUIRED = [
    "Target shape",
    "Ownership",
    "Lanes",
    "Platform scope",
    "Out of scope",
    "IaC-first",
    "Success criteria",
]


def main() -> int:
    if not SPEC.is_file():
        print(f"missing {SPEC}", file=sys.stderr)
        return 1
    text = SPEC.read_text()
    missing = []
    for needle in REQUIRED:
        if not re.search(rf"(?im)^#+\s+.*{re.escape(needle)}", text):
            # also accept bold/plain line containing the phrase as a heading-ish
            if needle.lower() not in text.lower():
                missing.append(needle)
    if missing:
        print(f"SPEC.md missing sections: {missing}", file=sys.stderr)
        return 1
    print(f"ok: SPEC sections present in {SPEC}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
