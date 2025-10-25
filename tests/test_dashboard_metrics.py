import base64
import json
from pathlib import Path

import pytest

from app.backend import db
from app.backend import dashboard_metrics as dm


@pytest.fixture(autouse=True)
def _use_temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "data.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_path))
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))
    db.init_db()
    yield
    if db_path.exists():
        db_path.unlink()


def test_collect_dashboard_metrics_structure():
    metrics = dm.collect_dashboard_metrics("global")
    assert metrics["scope"] == "global"
    assert "learning" in metrics and "qa" in metrics
    learning = metrics["learning"]
    assert set(learning.keys()) >= {
        "canonical_items",
        "synonyms",
        "pair_judgements",
        "group_patterns",
        "cluster_pending",
        "last_decision_at",
    }
    qa_summary = metrics["qa"]["summary"]
    assert qa_summary["total"] == 4
    assert qa_summary["passed"] == 2
    assert qa_summary["pending"] == 1
    assert qa_summary["blocked"] == 1
    assert qa_summary["pass_rate"] == pytest.approx(50.0)


def test_render_dashboard_report_generates_pdf():
    result = dm.render_dashboard_report("global")
    assert result["ok"] is True
    assert "pdf_base64" in result
    raw = base64.b64decode(result["pdf_base64"])[:5]
    assert raw == b"%PDF-"


def test_dashboard_html_contains_core_indicators():
    html_path = Path(__file__).resolve().parents[1] / "gui" / "learning_dashboard.html"
    content = html_path.read_text(encoding="utf-8")
    assert 'id="canonical-count"' in content
    assert 'id="qa-progress"' in content
    assert 'id="btn-export"' in content
