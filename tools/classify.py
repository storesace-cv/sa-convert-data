from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.backend.classification_engine import (  # noqa: E402
    build_classification_rules,
    merge_with_existing,
)
from app.backend.classification_rules import RULES_PATH  # noqa: E402
from app.backend.db import connect, init_db  # noqa: E402


def _count_entries(payload: dict) -> int:
    scopes = payload.get("scopes", {}) or {}
    total = 0
    for scope_data in scopes.values():
        canonical = scope_data.get("canonical", {}) or {}
        total += len(canonical)
    return total


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate classification rules")
    parser.add_argument("--out", type=Path, default=RULES_PATH, help="Output JSON path")
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Overwrite file without merging existing scopes",
    )
    args = parser.parse_args(argv)

    init_db()
    conn = connect()
    try:
        payload = build_classification_rules(conn)
    finally:
        conn.close()

    existing = None
    if not args.no_merge and args.out.exists():
        with args.out.open("r", encoding="utf-8") as handle:
            existing = json.load(handle)

    merged = merge_with_existing(existing, payload)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as handle:
        json.dump(merged, handle, ensure_ascii=False, indent=2, sort_keys=True)

    total = _count_entries(merged)
    print(
        json.dumps(
            {
                "ok": True,
                "out": str(args.out),
                "canonical_entries": total,
            }
        )
    )
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

