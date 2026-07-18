#!/usr/bin/env python3
"""Assert Homie DO droplet exists and is assigned to the Homie project."""

from __future__ import annotations

import json
import subprocess
import sys

PROJECT_ID = "3ff485b0-8b3e-4f09-8798-079d56ecc498"
NAME_HINTS = ("homie-k3s", "homie")


def run(argv: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, capture_output=True, text=True, timeout=60, check=False)


def main() -> int:
    if run(["doctl", "version"]).returncode != 0:
        print("doctl not available or not authed", file=sys.stderr)
        return 1

    listing = run(["doctl", "compute", "droplet", "list", "--output", "json"])
    if listing.returncode != 0:
        print(listing.stderr or "droplet list failed", file=sys.stderr)
        return 1
    droplets = json.loads(listing.stdout or "[]")
    matches = [
        d
        for d in droplets
        if any(h in str(d.get("name", "")).lower() for h in NAME_HINTS)
    ]
    if not matches:
        print("no Homie-named droplet found", file=sys.stderr)
        return 1

    proj = run(["doctl", "projects", "resources", "list", PROJECT_ID, "--output", "json"])
    if proj.returncode != 0:
        print(proj.stderr or "project resources list failed", file=sys.stderr)
        return 1
    resources = json.loads(proj.stdout or "[]")
    urns = {str(r.get("urn", r.get("id", ""))) for r in resources}
    for d in matches:
        did = str(d.get("id", ""))
        urn = f"do:droplet:{did}"
        if urn in urns or any(did in u for u in urns):
            print(f"ok: droplet {d.get('name')} ({did}) in Homie project")
            return 0

    print(
        f"droplet(s) {[d.get('name') for d in matches]} exist but not assigned to Homie project",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
