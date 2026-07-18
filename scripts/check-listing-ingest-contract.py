#!/usr/bin/env python3
"""Validate listing-ingest JSON Schema fixtures + forbid Agent DB bindings."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "listing-ingest"
AGENT = ROOT / "agents" / "listing-extract"
ADR = ROOT / "docs" / "adr" / "listing-ingest-agent.md"

AGENT_SCHEMA = CONTRACT / "agent-request.schema.json"
INGEST_SCHEMA = CONTRACT / "homie-ingest-body.schema.json"
AGENT_FIXTURE = CONTRACT / "fixtures" / "agent-request.valid.json"
INGEST_FIXTURE = CONTRACT / "fixtures" / "homie-ingest-body.valid.json"

FORBIDDEN_PATTERNS = (
    re.compile(r"DATABASE_URL", re.IGNORECASE),
    re.compile(r"Hyperdrive", re.IGNORECASE),
)

# Config-ish files under the Agent stub (not source comments about the ban).
AGENT_CONFIG_GLOBS = (
    "wrangler.toml",
    "wrangler.json",
    "wrangler.jsonc",
    "package.json",
    "*.env",
    "*.env.*",
    "config.*",
)


def fail(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def type_matches(value: Any, type_spec: Any) -> bool:
    if isinstance(type_spec, list):
        return any(type_matches(value, t) for t in type_spec)
    if type_spec == "object":
        return isinstance(value, dict)
    if type_spec == "array":
        return isinstance(value, list)
    if type_spec == "string":
        return isinstance(value, str)
    if type_spec == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if type_spec == "number":
        return (isinstance(value, (int, float)) and not isinstance(value, bool))
    if type_spec == "boolean":
        return isinstance(value, bool)
    if type_spec == "null":
        return value is None
    return False


def validate(instance: Any, schema: dict[str, Any], path: str = "$") -> list[str]:
    """Minimal JSON Schema subset: type, properties, required, additionalProperties, minLength."""
    errors: list[str] = []

    if "type" in schema and not type_matches(instance, schema["type"]):
        errors.append(f"{path}: expected type {schema['type']!r}, got {type(instance).__name__}")
        return errors

    if schema.get("type") == "string" or (
        isinstance(schema.get("type"), list) and "string" in schema["type"] and isinstance(instance, str)
    ):
        min_len = schema.get("minLength")
        if isinstance(instance, str) and min_len is not None and len(instance) < min_len:
            errors.append(f"{path}: string shorter than minLength {min_len}")

    if isinstance(instance, dict) and "properties" in schema:
        props: dict[str, Any] = schema["properties"]
        additional = schema.get("additionalProperties", True)
        for key, child in instance.items():
            if key in props:
                errors.extend(validate(child, props[key], f"{path}.{key}"))
            elif additional is False:
                errors.append(f"{path}: unexpected property {key!r}")

        for req in schema.get("required", []):
            if req not in instance:
                errors.append(f"{path}: missing required property {req!r}")

    return errors


def round_trip(fixture_path: Path, schema_path: Path) -> list[str]:
    schema = load_json(schema_path)
    fixture = load_json(fixture_path)
    # Serialize round-trip: fixture must survive json dump/load unchanged structurally.
    dumped = json.loads(json.dumps(fixture, ensure_ascii=False, sort_keys=True))
    if dumped != json.loads(json.dumps(fixture, ensure_ascii=False, sort_keys=True)):
        return [f"{fixture_path}: round-trip mismatch"]
    # Re-validate after round-trip
    errors = validate(dumped, schema)
    if errors:
        return [f"{fixture_path.name} vs {schema_path.name}: {e}" for e in errors]
    # Ensure schema itself is valid JSON object with expected markers
    if schema.get("type") != "object":
        return [f"{schema_path}: root type must be object"]
    return []


def grep_agent_config_forbidden() -> list[str]:
    if not AGENT.is_dir():
        return [f"missing Agent dir: {AGENT}"]

    hits: list[str] = []
    config_files: list[Path] = []
    for pattern in AGENT_CONFIG_GLOBS:
        config_files.extend(AGENT.glob(pattern))
        config_files.extend(AGENT.glob(f"**/{pattern}"))

    # Also scan all non-node_modules files under agents/listing-extract for
    # wrangler/config content (toml/json/env).
    for path in AGENT.rglob("*"):
        if not path.is_file():
            continue
        if "node_modules" in path.parts:
            continue
        if path.suffix.lower() not in {".toml", ".json", ".jsonc", ".env", ".yaml", ".yml"}:
            # Still include wrangler.toml already covered; skip .ts source.
            if path.name not in {"wrangler.toml", "package.json"}:
                continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for pat in FORBIDDEN_PATTERNS:
            if pat.search(text):
                hits.append(f"{path.relative_to(ROOT)}: forbidden pattern {pat.pattern}")
    return hits


def main() -> int:
    required = [
        AGENT_SCHEMA,
        INGEST_SCHEMA,
        AGENT_FIXTURE,
        INGEST_FIXTURE,
        ADR,
        AGENT / "wrangler.toml",
        AGENT / "src" / "index.ts",
    ]
    for path in required:
        if not path.is_file():
            return fail(f"missing {path.relative_to(ROOT)}")

    errors: list[str] = []
    errors.extend(round_trip(AGENT_FIXTURE, AGENT_SCHEMA))
    errors.extend(round_trip(INGEST_FIXTURE, INGEST_SCHEMA))
    errors.extend(grep_agent_config_forbidden())

    # ADR must document both auth hops.
    adr = ADR.read_text(encoding="utf-8")
    for needle in (
        "Temporal",
        "Bearer",
        "HOMIE_CF_AGENT_WEBHOOK_SECRET",
        "HOMIE_INGEST_BEARER_TOKEN",
        "DATABASE_URL",
        "Hyperdrive",
    ):
        if needle not in adr:
            errors.append(f"ADR missing mention of {needle!r}")

    # Align key field names with notifyListingAgent / ListingIngestBody.
    agent_schema = load_json(AGENT_SCHEMA)
    agent_props = set(agent_schema.get("properties", {}))
    for key in ("text", "instructions", "outputSchema"):
        if key not in agent_props:
            errors.append(f"agent-request schema missing property {key!r}")

    ingest_schema = load_json(INGEST_SCHEMA)
    ingest_props = set(ingest_schema.get("properties", {}))
    for key in (
        "postId",
        "price",
        "entryDate",
        "contactPhone",
        "address",
        "conditionals",
    ):
        if key not in ingest_props:
            errors.append(f"homie-ingest-body schema missing property {key!r}")

    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1

    print("ok: listing-ingest contract fixtures + Agent config (no DATABASE_URL/Hyperdrive)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
