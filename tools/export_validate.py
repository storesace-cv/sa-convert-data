#!/usr/bin/env python3
"""
tools/export_validate.py — CLI + helper for Phase 4 tests

Creates .xlsx, .csv and .json report under SA_CONVERT_EXPORT_DIR/batch_id.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.backend.audit import current_user, log_action
from app.backend.cardex_schema import CARDEX_FIELD_ORDER
from app.backend.db import connect
from app.backend.exporter_excel import export_excel_using_model


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _default_model_path() -> str:
    return str(Path("databases") / "models" / "export template.xlsx")


def run_export_validation(
    batch_id: str,
    model_path: Optional[str] = None,
    export_dir: Optional[str] = None,
) -> Dict[str, str]:
    if not batch_id:
        raise ValueError("batch_id is required")

    base_dir = Path(export_dir or os.getenv("SA_CONVERT_EXPORT_DIR", "exports"))
    out_dir = base_dir / batch_id
    _ensure_dir(out_dir)

    resolved_model = model_path or _default_model_path()

    xlsx_path = out_dir / f"export_{batch_id}.xlsx"
    csv_path = out_dir / f"export_{batch_id}.csv"
    report_path = out_dir / f"report_{batch_id}.json"

    export_result = export_excel_using_model(resolved_model, str(xlsx_path), batch_id)
    cleaned_rows = export_result.get("cleaned_rows", [])
    validation_data = export_result.get("validation", {})
    total_rows = int(validation_data.get("total_rows", len(cleaned_rows)))

    with csv_path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(CARDEX_FIELD_ORDER)
        for row in cleaned_rows:
            writer.writerow([row.get(column, "") for column in CARDEX_FIELD_ORDER])

    validation_summary = {
        "rounding_adjustments": len(validation_data.get("rounding_adjustments", [])),
        "invalid_monetary": len(validation_data.get("invalid_monetary", [])),
        "defaults_applied": len(validation_data.get("defaults_applied", [])),
        "missing_columns": sum(validation_data.get("missing_columns", {}).values()) if isinstance(validation_data.get("missing_columns"), dict) else 0,
    }

    report_payload = {
        "batch_id": batch_id,
        "model_path": resolved_model,
        "status": "OK",
        "validation": validation_data,
        "validation_summary": validation_summary,
        "artifacts": {
            "xlsx": str(xlsx_path),
            "csv": str(csv_path),
        },
    }
    report_path.write_text(
        json.dumps(report_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    conn = connect()
    try:
        with conn:
            log_action(
                conn,
                f"batch:{batch_id}",
                "export_validation",
                {
                    "batch_id": batch_id,
                    "model_path": resolved_model,
                    "user": current_user(),
                    "artifacts": report_payload["artifacts"],
                    "validation": {"total_rows": total_rows},
                    "validation_summary": validation_summary,
                },
            )
    finally:
        conn.close()

    return {
        "out": str(xlsx_path),
        "xlsx": str(xlsx_path),
        "csv": str(csv_path),
        "report": str(report_path),
    }

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Export results and validate structure/rounding (minimal artifacts)")
    parser.add_argument("--batch-id", required=True)
    parser.add_argument("--model-path", default=None)
    parser.add_argument("--export-dir", default=None)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    result = run_export_validation(args.batch_id, model_path=args.model_path, export_dir=args.export_dir)
    if args.verbose:
        print(json.dumps(result, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main())
