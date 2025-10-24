import importlib
from pathlib import Path

import app.backend.learning_rules as learning_rules_module

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


def _prepare_variant_workbook(path: Path) -> None:
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
            "Manteiga sem sal;Manteiga s/ sal 250G",
            "KG",
            "KG",
            "KG",
            "KG",
            "Manteiga sem sal 250g",
        ]
    )
    ws.append(
        [
            "manteiga s/ sal 250 g",
            "laticínios",
            "manteiga",
            "Manteiga sem sal 250 g;Manteiga sem sál 250g",
            "Kg",
            "Kg",
            "Kg",
            "Kg",
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
    assert result["pair_judgement_updates"] >= 1
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


def test_forget_learning_removes_scope_data(tmp_path, monkeypatch):
    db_path = tmp_path / "learning.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))

    import app.backend.db as db_module
    import app.backend.learning_importer as importer

    importlib.reload(db_module)
    importlib.reload(importer)

    xlsx_path = tmp_path / "learning.xlsx"
    _prepare_workbook(xlsx_path)

    importer.learn_from_xlsx(str(xlsx_path), scope="global")

    result = importer.forget_learning(scope="global")

    assert result["ok"] is True
    assert result["synonyms_deleted"] >= 1
    assert result["group_patterns_deleted"] == 1
    assert result["class_map_deleted"] == 1
    assert result["canonical_items_deleted"] >= 1
    assert result["logs_deleted"] == 1
    assert result["pair_judgements_deleted"] >= 1
    assert result["action_id"] > 0

    conn = db_module.connect()
    try:
        assert conn.execute("SELECT COUNT(*) FROM canonical_synonym").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM group_pattern").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM class_map").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM canonical_item").fetchone()[0] == 0

        cur = conn.execute("SELECT action FROM decision_log")
        rows = [row[0] for row in cur.fetchall()]
        assert rows == ["learning_forget"]
    finally:
        conn.close()


def test_learning_importer_handles_variants_and_pairs(tmp_path, monkeypatch):
    db_path = tmp_path / "learning.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))

    import app.backend.db as db_module
    import app.backend.learning_importer as importer

    importlib.reload(db_module)
    importlib.reload(importer)

    xlsx_path = tmp_path / "learning_variants.xlsx"
    _prepare_variant_workbook(xlsx_path)

    result = importer.learn_from_xlsx(str(xlsx_path), scope="global")

    assert result["ok"] is True
    assert result["canonical_created"] == 1
    assert result["pair_judgement_updates"] >= 3

    conn = db_module.connect()
    try:
        cur = conn.execute("SELECT COUNT(*) FROM canonical_item")
        assert cur.fetchone()[0] == 1

        cur = conn.execute("SELECT COUNT(*) FROM canonical_synonym")
        assert cur.fetchone()[0] >= 3

        cur = conn.execute(
            "SELECT COUNT(*) FROM pair_judgement WHERE label='duplicate'"
        )
        assert cur.fetchone()[0] >= 3
    finally:
        conn.close()


def test_learning_rules_roundtrip(tmp_path, monkeypatch):
    db_path = tmp_path / "learning.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))

    import app.backend.db as db_module
    import app.backend.learning_importer as importer

    importlib.reload(db_module)
    importlib.reload(importer)
    importlib.reload(learning_rules_module)

    xlsx_path = tmp_path / "learning.xlsx"
    _prepare_variant_workbook(xlsx_path)

    importer.learn_from_xlsx(str(xlsx_path), scope="global")

    conn = db_module.connect()
    try:
        scope_payload = learning_rules_module.dump_scope(conn, "global")
    finally:
        conn.close()

    rules_data = learning_rules_module.merge_rules(
        learning_rules_module.default_rules(),
        "global",
        scope_payload,
    )

    new_db_path = tmp_path / "learning_copy.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(new_db_path))

    importlib.reload(db_module)
    importlib.reload(importer)
    importlib.reload(learning_rules_module)

    db_module.init_db()
    conn = db_module.connect()
    try:
        with conn:
            summary = learning_rules_module.apply_rules(conn, rules_data, "global")
        cur = conn.execute("SELECT COUNT(*) FROM canonical_item")
        assert cur.fetchone()[0] == 1
        cur = conn.execute("SELECT COUNT(*) FROM canonical_synonym")
        assert cur.fetchone()[0] >= 3
        cur = conn.execute(
            "SELECT COUNT(*) FROM pair_judgement WHERE label='duplicate'"
        )
        assert cur.fetchone()[0] >= 3
    finally:
        conn.close()

    assert summary["canonical"] >= 1
    assert summary["synonyms"] >= 1
    assert summary["pair_judgements"] >= 1
