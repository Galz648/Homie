#!/usr/bin/env python3
"""Run homie-ingest contract tests: bearer auth, upsert, Slack notify."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "services" / "homie-ingest"


def main() -> int:
    if not PKG.is_dir():
        print(f"missing package dir: {PKG}", file=sys.stderr)
        return 1

    bun = shutil.which("bun")
    if not bun:
        print("bun not found on PATH", file=sys.stderr)
        return 1

    install = subprocess.run(
        [bun, "install", "--frozen-lockfile"],
        cwd=PKG,
        capture_output=True,
        text=True,
    )
    if install.returncode != 0:
        # First run may lack lockfile — fall back to plain install.
        install = subprocess.run(
            [bun, "install"],
            cwd=PKG,
            capture_output=True,
            text=True,
        )
        if install.returncode != 0:
            sys.stderr.write(install.stdout)
            sys.stderr.write(install.stderr)
            return install.returncode

    test = subprocess.run(
        [bun, "test"],
        cwd=PKG,
    )
    if test.returncode != 0:
        print("homie-ingest contract tests failed", file=sys.stderr)
        return test.returncode

    print("ok: homie-ingest contract tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
