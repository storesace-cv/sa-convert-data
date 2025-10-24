import importlib
from pathlib import Path

from openpyxl import Workbook

from app.backend.text_norm import normalize_name


def _prepare_workbook(path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.append(
        [
            "Nome",
            "Familia",
            "Subfamilia",
            "Sinonimos",
            "Unidade Default",
            "Unidade Compra",
            "Unidade Stock",
            "Unidade Logistica",
            "Fingerprint",
        ]
    )
    ws.append(
        [
            "Manteiga sem sal 250g",
            "Laticinios",
            "Manteiga",
            "Manteiga sem sal;Manteiga s/ sal",
            "KG",
            "KG",
            "KG",
            "KG",
            "Manteiga sem sal 250g",
        ]
    )
    wb.save(path)
    wb.close()


def test_learning_importer_populates_knowledge(tmp_path, monkeypatch):
    db_path = tmp_path / "learning.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))

    import app.backend.db as db_module
    import app.backend.learning_importer as importer

    importlib.reload(db_module)
    importlib.reload(importer)

    xlsx_path = tmp_path / "learning.xlsx"
    _prepare_workbook(xlsx_path)

    result = importer.learn_from_xlsx(str(xlsx_path), scope="global")

    assert result["ok"] is True
    assert result["synonyms_upserted"] >= 1
    assert result["group_pattern_updates"] == 1
    assert result["logs_recorded"] == 1

    conn = db_module.connect()
    try:
        cur = conn.execute("SELECT name_canonico FROM canonical_item")
        labels = {row[0] for row in cur.fetchall()}
        assert "MANTEIGA (m)" in labels

        term_norm = normalize_name("Manteiga sem sal 250g")
        cur = conn.execute(
            "SELECT canonical_id FROM canonical_synonym WHERE term_norm=?",
            (term_norm,),
        )
        row = cur.fetchone()
        assert row is not None
        canonical_id = row[0]
        assert canonical_id > 0

        cur = conn.execute(
            "SELECT canonical_label, support_count FROM class_map WHERE scope='global'"
        )
        class_rows = cur.fetchall()
        assert any(r[0] == "MANTEIGA (m)" for r in class_rows)

        cur = conn.execute(
            """
            SELECT unit_default, unit_compra, unit_stock, unit_log, base_article_hint
            FROM group_pattern WHERE fingerprint=?
            """,
            (term_norm,),
        )
        gp = cur.fetchone()
        assert gp == ("KG", "KG", "KG", "KG", "Manteiga sem sal 250g")

        cur = conn.execute("SELECT COUNT(*) FROM decision_log")
        assert cur.fetchone()[0] == 1
    finally:
        conn.close()
