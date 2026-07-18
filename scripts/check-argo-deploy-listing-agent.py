#!/usr/bin/env python3
"""Assert Argo WorkflowTemplate for listing-extract Agent wrangler deploy exists."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = (
    ROOT
    / "infra"
    / "k3s"
    / "platform"
    / "argo-workflows"
    / "templates"
    / "homie-deploy-listing-agent.yaml"
)
EXAMPLE = (
    ROOT
    / "infra"
    / "k3s"
    / "platform"
    / "argo-workflows"
    / "examples"
    / "ci-deploy-listing-agent.yaml"
)
SECRET_EXAMPLE = (
    ROOT
    / "infra"
    / "k3s"
    / "platform"
    / "argo-workflows"
    / "examples"
    / "cloudflare-api-token.secret.example.yaml"
)
APPLY = ROOT / "scripts" / "apply-cloudflare-api-token-secret.sh"
WRANGLER = ROOT / "agents" / "listing-extract" / "wrangler.toml"

REQUIRED_TEMPLATE = (
    "homie-deploy-listing-agent",
    "wrangler deploy",
    "CLOUDFLARE_API_TOKEN",
    "cloudflare-api-token",
    "agents/listing-extract",
    "ListingExtractAgent",
    "git-branch",
)


def main() -> int:
    for path in (TEMPLATE, EXAMPLE, SECRET_EXAMPLE, APPLY, WRANGLER):
        if not path.is_file():
            print(f"missing {path.relative_to(ROOT)}", file=sys.stderr)
            return 1

    text = TEMPLATE.read_text(encoding="utf-8")
    for needle in REQUIRED_TEMPLATE:
        if needle not in text:
            print(f"template missing {needle!r}", file=sys.stderr)
            return 1

    wrangler = WRANGLER.read_text(encoding="utf-8")
    for needle in ("ListingExtractAgent", "new_sqlite_classes", "nodejs_compat"):
        if needle not in wrangler:
            print(f"wrangler.toml missing {needle!r}", file=sys.stderr)
            return 1

    if "REPLACE_ME" not in SECRET_EXAMPLE.read_text(encoding="utf-8"):
        print("secret example should use REPLACE_ME placeholder", file=sys.stderr)
        return 1

    print("ok: Argo listing-agent deploy WorkflowTemplate + secret example")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
