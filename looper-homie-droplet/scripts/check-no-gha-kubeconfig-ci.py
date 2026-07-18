#!/usr/bin/env python3
"""Assert Homie CI docs/templates prefer pull model over GHA kubeconfig submit."""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MARKERS = [
    REPO / "infra/k3s/platform/argo-workflows/examples/ci-staging-poll-cronjob.yaml",
    REPO / "infra/k3s/platform/argo-workflows/README.md",
]


def main() -> int:
    poll = MARKERS[0]
    if not poll.is_file():
        print(f"missing poll CronJob: {poll}", file=sys.stderr)
        return 1
    text = poll.read_text(encoding="utf-8")
    if "staging" not in text or "schedule" not in text:
        print("poll CronJob does not look like a staging schedule poller", file=sys.stderr)
        return 1

    readme = MARKERS[1]
    if readme.is_file():
        body = readme.read_text(encoding="utf-8").lower()
        if "pull" not in body and "poll" not in body:
            print("argo-workflows README missing pull/poll CI guidance", file=sys.stderr)
            return 1
        # Soft fail if README still claims kubeconfig as primary without pull
        if "homie_k3s_kubeconfig" in body and "primary" in body and "pull" not in body:
            print("README still frames HOMIE_K3S_KUBECONFIG as primary CI", file=sys.stderr)
            return 1

    print("ok: pull/poll CI artifacts present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
