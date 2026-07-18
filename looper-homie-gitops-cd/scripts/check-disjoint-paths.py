#!/usr/bin/env python3
"""Assert write_paths are disjoint within each parallel_group."""

from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath


def parse_packages(text: str) -> list[dict[str, str]]:
    blocks = re.split(r"\n(?=##\s+)", text)
    out: list[dict[str, str]] = []
    for block in blocks:
        fields: dict[str, str] = {}
        for key in (
            "id",
            "parallel_group",
            "write_paths",
        ):
            m = re.search(rf"(?im)^\s*[-*]?\s*{key}\s*:\s*(.+)$", block)
            if m:
                fields[key] = m.group(1).strip()
        if {"id", "parallel_group", "write_paths"} <= fields.keys():
            out.append(fields)
    return out


def path_prefixes(raw: str) -> list[PurePosixPath]:
    parts = [p.strip() for p in re.split(r"[,]+", raw) if p.strip()]
    return [PurePosixPath(p.replace("\\", "/").lstrip("./")) for p in parts]


def overlaps(a: PurePosixPath, b: PurePosixPath) -> bool:
    try:
        a.relative_to(b)
        return True
    except ValueError:
        pass
    try:
        b.relative_to(a)
        return True
    except ValueError:
        return False


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: check-disjoint-paths.py PLAN.md", file=sys.stderr)
        return 2
    plan = Path(sys.argv[1])
    if not plan.is_file():
        print(f"missing {plan}", file=sys.stderr)
        return 1
    packages = parse_packages(plan.read_text(encoding="utf-8"))
    if len(packages) < 2:
        print("need >=2 packages with write_paths", file=sys.stderr)
        return 1

    by_group: dict[str, list[dict[str, str]]] = defaultdict(list)
    for pkg in packages:
        by_group[pkg["parallel_group"]].append(pkg)

    errors: list[str] = []
    for group, pkgs in by_group.items():
        for i, left in enumerate(pkgs):
            left_paths = path_prefixes(left["write_paths"])
            if not left_paths:
                errors.append(f"{left['id']}: empty write_paths")
                continue
            for right in pkgs[i + 1 :]:
                right_paths = path_prefixes(right["write_paths"])
                for lp in left_paths:
                    for rp in right_paths:
                        if overlaps(lp, rp):
                            errors.append(
                                f"group {group}: {left['id']} ({lp}) overlaps "
                                f"{right['id']} ({rp})"
                            )
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print(f"ok: disjoint write_paths across {len(by_group)} parallel_group(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
