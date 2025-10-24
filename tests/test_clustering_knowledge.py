import importlib
from pathlib import Path

from app.backend.text_norm import normalize_name


def _insert_imported_article(conn, batch_id: str, nome: str, familia: str, subfamilia: str) -> int:
    term_norm = normalize_name(nome)
    cur = conn.execute(
        """
        INSERT INTO imported_raw(batch_id, row_index, nome, nome_norm, familia, subfamilia, created_at)
        VALUES(?,?,?,?,?,?,datetime('now'))
        """,
        (batch_id, 1, nome, term_norm, familia, subfamilia),
    )
    raw_id = cur.lastrowid
    conn.execute(
        """
        INSERT INTO working_article(
            batch_id, raw_id, nome_norm, nome_sem_stop,
            quantidade_total, quantidade_unidade, quantidade_tipo,
            quantidade_numero, flag_com_sal, flag_sem_sal, marca_detectada
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            batch_id,
            raw_id,
            term_norm,
            term_norm,
            250.0,
            "G",
            "MASS",
            None,
            0,
            0,
            None,
        ),
    )
    return raw_id


def test_clustering_uses_learning_data(tmp_path, monkeypatch):
    db_path = tmp_path / "cluster.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))

    import app.backend.db as db_module
    import app.backend.clustering as clustering

    importlib.reload(db_module)
    importlib.reload(clustering)

    db_module.init_db()
    conn = db_module.connect()
    term_norm = normalize_name("Manteiga sem sal 250g")

    with conn:
        cur = conn.execute(
            """
            INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at)
            VALUES(?,?,?,datetime('now'))
            """,
            ("MANTEIGA (m)", "global", "v1"),
        )
        canonical_id = cur.lastrowid

        conn.execute(
            """
            INSERT INTO canonical_synonym(scope, term_norm, canonical_id, confidence, source)
            VALUES(?,?,?,?,?)
            """,
            ("global", term_norm, canonical_id, 1.0, "test"),
        )

        conn.execute(
            """
            INSERT INTO group_pattern(
                scope, fingerprint, canonical_id,
                unit_default, unit_compra, unit_stock, unit_log,
                base_article_hint, support_count, source
            ) VALUES(?,?,?,?,?,?,?,?,?,?)
            """,
            (
                "global",
                term_norm,
                canonical_id,
                "KG",
                "KG",
                "KG",
                "KG",
                "Manteiga referência",
                3,
                "test",
            ),
        )

        _insert_imported_article(
            conn,
            "batch-1",
            "Manteiga sem sal 250g",
            "Laticinios",
            "Manteiga",
        )
        _insert_imported_article(
            conn,
            "batch-1",
            "Manteiga sem sal 250g",
            "Laticinios",
            "Manteiga",
        )

    result = clustering.propose_clusters("batch-1", scope="global")

    assert result["ok"] is True
    assert result["clusters_created"] == 1

    conn = db_module.connect()
    try:
        cur = conn.execute(
            "SELECT label_sugerido FROM cluster_proposal WHERE batch_id=?",
            ("batch-1",),
        )
        label = cur.fetchone()[0]
        assert "MANTEIGA (m)" in label
        assert "UD=KG" in label

        cur = conn.execute(
            """
            SELECT cm.selected_by_user
            FROM cluster_member cm
            JOIN working_article wa ON wa.id=cm.working_id
            WHERE cm.cluster_id=(SELECT id FROM cluster_proposal LIMIT 1)
            ORDER BY wa.id
            """
        )
        selections = [row[0] for row in cur.fetchall()]
        assert selections == [1, 1]
    finally:
        conn.close()
