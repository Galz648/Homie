#!/usr/bin/env python3
"""Require CHANGE-MAP.md to answer image / pin / secrets / CI."""
from __future__ import annotations

import sys
from pathlib import Path

REQUIRED = ("custom image", "pin", "secret", "CI")


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "loop-workspace/CHANGE-MAP.md")
    if not path.is_file():
        print(f"missing {path}", file=sys.stderr)
        return 1
    text = path.read_text().lower()
    missing = [k for k in REQUIRED if k.lower() not in text]
    if missing:
        print("CHANGE-MAP.md missing topics:", missing, file=sys.stderr)
        return 1
    if "tbd" in text and "no tbd" not in text:
        # allow the phrase "no TBDs"
        if "tbd:" in text or "- tbd" in text:
            print("CHANGE-MAP.md still has TBD items", file=sys.stderr)
            return 1
    print("ok: CHANGE-MAP.md covers image/pin/secrets/CI")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
