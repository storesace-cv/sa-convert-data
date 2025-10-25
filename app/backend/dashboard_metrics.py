from __future__ import annotations

import base64
import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict

from reportbro import Report

from app.backend.db import connect, init_db, now_utc

REPO_ROOT = Path(__file__).resolve().parents[2]
GUI_DIR = REPO_ROOT / "gui"
QA_RESULTS_PATH = REPO_ROOT / "tests" / "qa_results.json"
REPORT_TEMPLATE_PATH = GUI_DIR / "reportbro_dashboard.json"


class DashboardMetricsError(RuntimeError):
    """Raised when dashboard metrics cannot be produced."""


def _safe_read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
        raise DashboardMetricsError(f"Invalid JSON in {path}: {exc}") from exc


def _load_qa_summary() -> Dict[str, Any]:
    data = _safe_read_json(QA_RESULTS_PATH)
    checks = data.get("checks") or []
    counts = Counter(item.get("status", "unknown") for item in checks)
    total = sum(counts.values())
    passed = counts.get("pass", 0)
    failed = counts.get("fail", 0)
    pending = counts.get("pending", 0)
    blocked = counts.get("blocked", 0)
    unknown = total - passed - failed - pending - blocked
    pass_rate = (passed / total * 100.0) if total else 0.0

    return {
        "generated_at": data.get("generated_at"),
        "suite": data.get("suite", "gui_qa"),
        "checks": [
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "status": item.get("status", "unknown"),
                "details": item.get("details"),
            }
            for item in checks
        ],
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pending": pending,
            "blocked": blocked,
            "unknown": max(unknown, 0),
            "pass_rate": round(pass_rate, 2),
        },
    }


def _load_rules_snapshot() -> Dict[str, Any]:
    rules_path = REPO_ROOT / "rules" / "classification_rules.json"
    learning_path = REPO_ROOT / "rules" / "learning_rules.json"

    classification = _safe_read_json(rules_path)
    learning = _safe_read_json(learning_path)

    def _count_rules(scopes: Dict[str, Any]) -> int:
        total = 0
        for scope_data in scopes.values():
            rules = scope_data.get("rules")
            if isinstance(rules, list):
                total += len(rules)
            elif isinstance(rules, dict):
                total += len(rules)
        return total

    classification_scopes = classification.get("scopes") or {}
    learning_scopes = learning.get("scopes") or {}

    return {
        "classification": {
            "scopes": len(classification_scopes),
            "rules": _count_rules(classification_scopes),
            "generated_at": classification.get("generated_at"),
        },
        "learning": {
            "scopes": len(learning_scopes),
            "rules": _count_rules(learning_scopes),
            "updated_at": learning.get("updated_at"),
        },
    }


def collect_dashboard_metrics(scope: str = "global") -> Dict[str, Any]:
    """Collect aggregated metrics for the learning dashboard."""

    init_db()
    conn = connect()
    try:
        conn.row_factory = lambda cursor, row: row  # pragma: no cover - compatibility guard
        canonical_items = conn.execute(
            "SELECT COUNT(*) FROM canonical_item WHERE scope=?", (scope,)
        ).fetchone()[0]
        synonyms = conn.execute(
            "SELECT COUNT(*) FROM canonical_synonym WHERE scope=?", (scope,)
        ).fetchone()[0]
        pair_judgements = conn.execute(
            "SELECT COUNT(*) FROM pair_judgement WHERE scope=?", (scope,)
        ).fetchone()[0]
        group_patterns = conn.execute(
            "SELECT COUNT(*) FROM group_pattern WHERE scope=?", (scope,)
        ).fetchone()[0]
        cluster_pending = conn.execute(
            "SELECT COUNT(*) FROM cluster_proposal WHERE batch_id IS NOT NULL"
        ).fetchone()[0]
        last_decision = conn.execute(
            "SELECT ts FROM decision_log WHERE scope=? ORDER BY ts DESC LIMIT 1",
            (scope,),
        ).fetchone()
    finally:
        conn.close()

    qa_summary = _load_qa_summary()
    rules_snapshot = _load_rules_snapshot()

    metrics = {
        "scope": scope,
        "generated_at": now_utc(),
        "learning": {
            "canonical_items": canonical_items,
            "synonyms": synonyms,
            "pair_judgements": pair_judgements,
            "group_patterns": group_patterns,
            "cluster_pending": cluster_pending,
            "last_decision_at": last_decision[0] if last_decision else None,
        },
        "rules": rules_snapshot,
        "qa": qa_summary,
    }

    return metrics


def render_dashboard_report(scope: str = "global") -> Dict[str, Any]:
    metrics = collect_dashboard_metrics(scope)
    if not REPORT_TEMPLATE_PATH.exists():
        raise DashboardMetricsError(
            "ReportBro template missing at gui/reportbro_dashboard.json"
        )

    template = _safe_read_json(REPORT_TEMPLATE_PATH)
    report = Report(template, {"metrics": metrics})
    pdf_bytes = report.generate_pdf()

    filename = f"learning-dashboard-{scope}-{metrics['generated_at'].replace(':', '')}.pdf"
    return {
        "ok": True,
        "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        "filename": filename,
        "metrics": metrics,
    }
