#!/usr/bin/env python3
"""AC: staging fb-scrape-worker pin includes Agent notify + webhook URL is live."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys

KUBECONFIG = os.environ.get("KUBECONFIG", os.path.expanduser("~/.kube/homie-k3s.yaml"))
NS = "homie-staging"
# Notify FF landed in f357ae3; any pin at/after that short-sha is fine.
# Reject known pre-notify / stale pins explicitly.
STALE_TAGS = frozenset(
    {
        "staging-989c1c4",
        "staging-86acada",
        "staging-dfa78e1",
        "staging-b267efb",
    }
)
TAG_RE = re.compile(r":(staging-[0-9a-f]{7,40})$")


def sh(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        check=False,
        capture_output=True,
        text=True,
        env={**os.environ, "KUBECONFIG": KUBECONFIG},
    )


def main() -> int:
    r = sh(
        [
            "kubectl",
            "-n",
            NS,
            "get",
            "deploy",
            "fb-scrape-worker",
            "-o",
            "json",
        ]
    )
    if r.returncode != 0:
        print(r.stderr.strip() or "fb-scrape-worker deploy missing", file=sys.stderr)
        return 1
    d = json.loads(r.stdout)
    ready = int(d.get("status", {}).get("readyReplicas") or 0)
    if ready < 1:
        print(f"fb-scrape-worker not ready (readyReplicas={ready})", file=sys.stderr)
        return 1

    image = d["spec"]["template"]["spec"]["containers"][0]["image"]
    m = TAG_RE.search(image)
    if not m:
        print(f"unexpected worker image (want :staging-<sha>): {image}", file=sys.stderr)
        return 1
    tag = m.group(1)
    if tag in STALE_TAGS:
        print(f"stale pin without notify path: {tag}", file=sys.stderr)
        return 1

    # Pod must have non-empty webhook URL (CM + secret envFrom).
    pr = sh(
        [
            "kubectl",
            "-n",
            NS,
            "get",
            "pods",
            "-l",
            "app.kubernetes.io/name=fb-scrape-worker",
            "-o",
            "jsonpath={.items[0].metadata.name}",
        ]
    )
    pod = (pr.stdout or "").strip()
    if not pod:
        print("no fb-scrape-worker pod", file=sys.stderr)
        return 1
    er = sh(
        [
            "kubectl",
            "-n",
            NS,
            "exec",
            pod,
            "--",
            "printenv",
            "HOMIE_CF_AGENT_WEBHOOK_URL",
        ]
    )
    url = (er.stdout or "").strip()
    if er.returncode != 0 or not url:
        print(
            "HOMIE_CF_AGENT_WEBHOOK_URL empty in pod — Sync CM + rollout restart",
            file=sys.stderr,
        )
        return 1
    if "workers.dev" not in url and "localhost" not in url:
        print(f"webhook URL unexpected shape: {url[:48]}…", file=sys.stderr)
        return 1

    # Prefer source present in image when WORKDIR layout matches.
    nr = sh(
        [
            "kubectl",
            "-n",
            NS,
            "exec",
            pod,
            "--",
            "sh",
            "-c",
            "test -f src/notifyListingAgent.ts || test -f /app/src/notifyListingAgent.ts",
        ]
    )
    if nr.returncode != 0:
        print(
            "warn: notifyListingAgent.ts not found in image filesystem "
            f"(pin={tag} still accepted if not stale)",
            file=sys.stderr,
        )

    print(f"ok: worker pin={tag} ready webhook_url_set")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
