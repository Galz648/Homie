#!/usr/bin/env python3
"""Assert PARALLEL-REPORT.md has required per-package evidence sections."""

from __future__ import annotations

import re
import sys
from pathlib import Path

REQUIRED_PHRASES = (
    "ac_command",
    "merge",
    "worktree",
)
MIN_PACKAGES = 2


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check-parallel-report.py PARALLEL-REPORT.md", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"missing {path}", file=sys.stderr)
        return 1
    text = path.read_text(encoding="utf-8")
    if "???" in text or "{{" in text or "TBD" in text:
        print("PARALLEL-REPORT.md still has placeholders/TBDs", file=sys.stderr)
        return 1
    sections = re.findall(r"(?im)^##\s+(\S+)", text)
    if len(sections) < MIN_PACKAGES:
        print(
            f"need >={MIN_PACKAGES} ## package sections; found {len(sections)}",
            file=sys.stderr,
        )
        return 1
    lower = text.lower()
    missing = [p for p in REQUIRED_PHRASES if p not in lower]
    if missing:
        print(f"PARALLEL-REPORT.md missing mentions of: {missing}", file=sys.stderr)
        return 1
    if "exit" not in lower and "ac pass" not in lower and "passed" not in lower:
        print(
            "PARALLEL-REPORT.md should record AC pass / exit evidence",
            file=sys.stderr,
        )
        return 1
    print(f"ok: PARALLEL-REPORT.md has {len(sections)} package sections")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
