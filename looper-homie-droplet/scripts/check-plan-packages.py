#!/usr/bin/env python3
"""Assert plan.md packages list required parallelization fields."""

from __future__ import annotations

import re
import sys
from pathlib import Path

FIELDS = (
    "id",
    "deps",
    "parallel_group",
    "worktree",
    "branch",
    "write_paths",
    "ac_command",
)
MIN_PACKAGES = 2


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check-plan-packages.py PLAN.md", file=sys.stderr)
        return 2
    plan = Path(sys.argv[1])
    if not plan.is_file():
        print(f"missing {plan}", file=sys.stderr)
        return 1
    text = plan.read_text(encoding="utf-8")
    blocks = re.split(r"\n(?=##\s+)", text)
    packages: list[str] = []
    for block in blocks:
        if not all(
            re.search(rf"(?im)^\s*[-*]?\s*{f}\s*:", block) for f in FIELDS
        ):
            continue
        packages.append(block)
    if len(packages) < MIN_PACKAGES:
        print(
            f"need >={MIN_PACKAGES} packages with {FIELDS}; found {len(packages)}",
            file=sys.stderr,
        )
        return 1
    ids: list[str] = []
    for block in packages:
        m = re.search(r"(?im)^\s*[-*]?\s*id\s*:\s*(\S+)", block)
        if m:
            ids.append(m.group(1))
    if len(ids) != len(set(ids)):
        print(f"duplicate package ids: {ids}", file=sys.stderr)
        return 1
    if "???" in text or "{{" in text:
        print("plan.md still has placeholders", file=sys.stderr)
        return 1
    print(f"ok: {len(packages)} packages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
