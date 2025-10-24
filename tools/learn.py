#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.backend.db import connect, init_db
from app.backend.learning_importer import forget_learning, learn_from_xlsx
from app.backend.learning_rules import (
    apply_rules,
    dump_scope,
    load_rules,
    merge_rules,
    prune_scope,
    save_rules,
)


def _run_import(args: argparse.Namespace) -> dict:
    scope = args.scope
    rules_path = Path(args.rules)

    init_db()
    rules = load_rules(rules_path)

    applied_summary: dict[str, int] = {
        "canonical": 0,
        "synonyms": 0,
        "class_map": 0,
        "patterns": 0,
        "pair_judgements": 0,
    }

    if not args.skip_rules:
        conn = connect()
        try:
            with conn:
                applied_summary = apply_rules(conn, rules, scope)
        finally:
            conn.close()

    result = learn_from_xlsx(args.file, scope=scope)

    conn = connect()
    try:
        scope_payload = dump_scope(conn, scope)
    finally:
        conn.close()

    updated_rules = merge_rules(rules, scope, scope_payload)
    save_rules(rules_path, updated_rules)

    return {
        "action": "import",
        "file": args.file,
        "scope": scope,
        "applied_rules": applied_summary,
        "result": result,
        "rules_path": str(rules_path),
        "items_exported": len(scope_payload.get("items", [])),
    }


def _run_forget(args: argparse.Namespace) -> dict:
    scope = args.scope
    rules_path = Path(args.rules)

    init_db()
    forget_result = forget_learning(scope=scope)

    rules = load_rules(rules_path)
    updated_rules = prune_scope(rules, scope)
    save_rules(rules_path, updated_rules)

    return {
        "action": "forget",
        "scope": scope,
        "result": forget_result,
        "rules_path": str(rules_path),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Learning engine runner")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("import", help="Import learning workbook and persist rules")
    run_parser.add_argument("--file", required=True, help="Path to the learning .xlsx file")
    run_parser.add_argument("--scope", default="global", help="Scope for the learning data")
    run_parser.add_argument(
        "--rules",
        default=str(Path("rules") / "learning_rules.json"),
        help="Path to the rules JSON file",
    )
    run_parser.add_argument(
        "--skip-rules",
        action="store_true",
        help="Skip applying previously saved rules before import",
    )

    forget_parser = subparsers.add_parser("forget", help="Remove learning data for a scope")
    forget_parser.add_argument("--scope", default="global", help="Scope to forget")
    forget_parser.add_argument(
        "--rules",
        default=str(Path("rules") / "learning_rules.json"),
        help="Path to the rules JSON file",
    )

    args = parser.parse_args(argv)

    if args.command == "import":
        payload = _run_import(args)
    elif args.command == "forget":
        payload = _run_forget(args)
    else:
        parser.error("Comando inválido")
        return 2

    print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())

