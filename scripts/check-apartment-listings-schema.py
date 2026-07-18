#!/usr/bin/env python3
"""Assert apartment_listings exists in Drizzle schema + migration SQL."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "Homie-Website" / "src" / "db" / "schema.ts"
MIGRATION = ROOT / "drizzle" / "0003_apartment_listings.sql"

REQUIRED_SCHEMA = (
    'export const apartmentListings = pgTable(',
    '"apartment_listings"',
    "postId:",
    "price:",
    "entryDate:",
    "contactPhone:",
    "address:",
    "conditionals:",
)
REQUIRED_SQL = (
    '"apartment_listings"',
    '"postId"',
    '"price"',
    '"entryDate"',
    '"contactPhone"',
    '"address"',
    '"conditionals"',
)


def main() -> int:
    if not SCHEMA.is_file():
        print(f"missing {SCHEMA}", file=sys.stderr)
        return 1
    if not MIGRATION.is_file():
        print(f"missing {MIGRATION}", file=sys.stderr)
        return 1
    schema = SCHEMA.read_text(encoding="utf-8")
    sql = MIGRATION.read_text(encoding="utf-8")
    for needle in REQUIRED_SCHEMA:
        if needle not in schema:
            print(f"schema missing: {needle!r}", file=sys.stderr)
            return 1
    for needle in REQUIRED_SQL:
        if needle not in sql:
            print(f"migration missing: {needle!r}", file=sys.stderr)
            return 1
    print("ok: apartment_listings schema + migration")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
