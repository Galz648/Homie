#!/usr/bin/env python3
"""Assert planned package worktrees are no longer listed by git worktree list."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


def package_worktrees(plan_text: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(r"(?im)^\s*[-*]?\s*worktree\s*:\s*(\S+)", plan_text):
        out.append(m.group(1).rstrip("/"))
    return out


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "usage: check-worktrees-cleaned.py REPO_DIR PLAN.md",
            file=sys.stderr,
        )
        return 2
    repo = Path(sys.argv[1])
    plan = Path(sys.argv[2])
    if not plan.is_file():
        print(f"missing {plan}", file=sys.stderr)
        return 1
    wanted = package_worktrees(plan.read_text(encoding="utf-8"))
    if not wanted:
        print("plan.md has no worktree: fields", file=sys.stderr)
        return 1
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo), "worktree", "list", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
    except FileNotFoundError:
        print("git not found", file=sys.stderr)
        return 1
    if proc.returncode != 0:
        print(proc.stderr or "git worktree list failed", file=sys.stderr)
        return 1
    listed = []
    for line in proc.stdout.splitlines():
        if line.startswith("worktree "):
            listed.append(line[len("worktree ") :].rstrip("/"))

    leftover = []
    for wt in wanted:
        # Exact path match or still present as directory path substring end
        for live in listed:
            if live == wt or live.endswith("/" + Path(wt).name):
                # Only flag if the planned path appears; primary worktree of repo is OK
                if Path(wt).name != Path(repo).resolve().name:
                    leftover.append(wt)
                    break
    if leftover:
        print(f"leftover worktrees still listed: {leftover}", file=sys.stderr)
        print("live:", listed, file=sys.stderr)
        return 1
    print(f"ok: no leftover worktrees for {len(wanted)} planned packages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
