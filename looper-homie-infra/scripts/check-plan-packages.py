#!/usr/bin/env python3
"""Assert plan.md lists work packages with required fields."""

from __future__ import annotations

import pathlib
import re
import sys

PLAN = pathlib.Path(__file__).resolve().parents[1] / "loop-workspace" / "plan.md"
MIN_PACKAGES = 3
FIELDS = ("id", "deps", "parallel_group", "worktree", "ac_command")


def main() -> int:
    if not PLAN.is_file():
        print(f"missing {PLAN}", file=sys.stderr)
        return 1
    text = PLAN.read_text()
    blocks = re.split(r"\n(?=##\s+)", text)
    packages: list[str] = []
    for block in blocks:
        soft_missing = [
            f
            for f in FIELDS
            if not re.search(rf"(?im)^\s*[-*]?\s*{f}\s*:", block)
        ]
        if soft_missing:
            continue
        packages.append(block)

    if len(packages) < MIN_PACKAGES:
        print(
            f"need >= {MIN_PACKAGES} packages with {FIELDS}; found {len(packages)}",
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

    print(f"ok: {len(packages)} packages in {PLAN}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
