#!/usr/bin/env python3
"""AC: Temporal FF Agent notify unit test (mocked fetch) exits 0."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # scrapers/facebook


def run(cmd: list[str]) -> int:
    print("+", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=ROOT).returncode


def main() -> int:
    # Worktree may not have node_modules yet.
    if not (ROOT / "node_modules" / "vitest").is_dir():
        code = run(["bun", "install"])
        if code != 0:
            print("bun install failed", file=sys.stderr)
            return code

    code = run(
        [
            "bun",
            "run",
            "test:e2e-mocks",
            "--",
            "tests/notifyListingAgent.test.ts",
        ]
    )
    if code != 0:
        print("notifyListingAgent tests failed", file=sys.stderr)
        return code
    print("ok: notifyListingAgent fire-and-forget unit tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
