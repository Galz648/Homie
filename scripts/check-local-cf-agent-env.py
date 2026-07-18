#!/usr/bin/env python3
"""Assert dual-home local env files have required CF Agent / ingest keys (no values printed)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

HOME = Path(os.environ.get("HOME", Path.home()))
WEBHOOK = HOME / ".config/homie/cf-agent-webhook.env"
INGEST = HOME / ".config/homie/ingest.env"

REQUIRED_WEBHOOK = (
    "HOMIE_CF_AGENT_WEBHOOK_SECRET",
    "HOMIE_CF_AGENT_WEBHOOK_AUTH",
    "HOMIE_CF_AGENT_WEBHOOK_URL",
)
REQUIRED_INGEST = (
    "HOMIE_INGEST_BEARER_TOKEN",
    "HOMIE_INGEST_URL",
)


def load_keys(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise FileNotFoundError(f"missing {path}")
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def main() -> int:
    try:
        wh = load_keys(WEBHOOK)
        ing = load_keys(INGEST)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        return 1

    missing: list[str] = []
    for k in REQUIRED_WEBHOOK:
        if not wh.get(k):
            missing.append(f"cf-agent-webhook.env:{k}")
    for k in REQUIRED_INGEST:
        if not ing.get(k):
            missing.append(f"ingest.env:{k}")

    if missing:
        print("missing or empty keys:", ", ".join(missing), file=sys.stderr)
        return 1

    url = wh["HOMIE_CF_AGENT_WEBHOOK_URL"]
    if "workers.dev" not in url and "http" not in url:
        print("HOMIE_CF_AGENT_WEBHOOK_URL does not look like an http(s) URL", file=sys.stderr)
        return 1

    print("ok: local cf-agent + ingest env keys present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
