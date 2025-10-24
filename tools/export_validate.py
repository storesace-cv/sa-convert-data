from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from app.backend.audit import log_action
from app.backend.db import connect, now_utc
from app.backend.exporter_excel import export_excel_using_model
from app.config import EXPORT_DIR, ensure_dirs


def _validation_summary(data: dict[str, Any]) -> dict[str, int]:
    return {
        "rounding_adjustments": len(data.get("rounding_adjustments", [])),
        "invalid_monetary": len(data.get("invalid_monetary", [])),
        "defaults_applied": len(data.get("defaults_applied", [])),
        "missing_columns": sum(data.get("missing_columns", {}).values()),
    }


def run_export_validation(
    batch_id: str,
    *,
    model_path: str | None = None,
    excel_out: str | None = None,
    report_out: str | None = None,
) -> dict[str, Any]:
    ensure_dirs()
    model = model_path or str(Path("databases/models/export template.xlsx"))
    excel_path = Path(excel_out or (EXPORT_DIR / "cleaned_articles.xlsx"))
    report_path = Path(report_out or (EXPORT_DIR / "validation_report.json"))

    result = export_excel_using_model(model, str(excel_path), batch_id)
    validation_data = result.get("validation", {})

    report_payload = {
        "batch_id": batch_id,
        "generated_at": now_utc(),
        "export_file": result.get("out"),
        "rows": result.get("rows", 0),
        "validation": validation_data,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    conn = connect()
    try:
        with conn:
            log_action(
                conn,
                f"batch:{batch_id}",
                "export_validation",
                {
                    "batch_id": batch_id,
                    "excel_out": str(excel_path),
                    "report_out": str(report_path),
                    "rows": result.get("rows", 0),
                    "validation_summary": _validation_summary(validation_data),
                },
            )
    finally:
        conn.close()

    return {
        **result,
        "report": str(report_path),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Export Cardex data with validation metadata.")
    parser.add_argument("batch_id", help="Identificador do batch aprovado.")
    parser.add_argument("--model", dest="model_path", help="Caminho para o modelo de exportação.")
    parser.add_argument("--excel-out", dest="excel_out", help="Caminho para o ficheiro Excel limpo.")
    parser.add_argument("--report-out", dest="report_out", help="Caminho para o relatório JSON.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    run_export_validation(
        args.batch_id,
        model_path=args.model_path,
        excel_out=args.excel_out,
        report_out=args.report_out,
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
