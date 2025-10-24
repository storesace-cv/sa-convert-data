from app.backend.classification_engine import build_classification_rules
from app.backend.db import connect, init_db, now_utc
from app.backend.text_norm import normalize_name


def _insert_canonical(conn, name: str) -> int:
    cur = conn.execute(
        """
        INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at)
        VALUES(?,?,?,?)
        """,
        (name, "global", "v1", now_utc()),
    )
    return int(cur.lastrowid)


def _insert_synonym(conn, canonical_id: int, term: str) -> None:
    conn.execute(
        """
        INSERT INTO canonical_synonym(scope, term_norm, canonical_id, confidence, source)
        VALUES(?,?,?,?,?)
        """,
        ("global", normalize_name(term), canonical_id, 1.0, "test"),
    )


def _insert_imported(
    conn,
    *,
    batch: str,
    row_index: int,
    name: str,
    class_compra: str | None = None,
    class_compra_venda: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO imported_raw(
            batch_id, row_index, nome, nome_norm,
            class_compra, class_venda, class_compra_venda,
            class_generico, class_producao, class_producao_venda,
            created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            batch,
            row_index,
            name,
            normalize_name(name),
            class_compra,
            None,
            class_compra_venda,
            None,
            None,
            None,
            now_utc(),
        ),
    )


def test_classification_inference_multiple_scenarios(tmp_path, monkeypatch):
    db_path = tmp_path / "data.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))
    init_db()

    conn = connect()
    batch = "batch-test"

    with conn:
        compra_only = _insert_canonical(conn, "Produto Compra")
        _insert_synonym(conn, compra_only, "Produto Compra")
        for idx in range(3):
            _insert_imported(
                conn,
                batch=batch,
                row_index=idx + 1,
                name="Produto Compra",
                class_compra="X",
            )

        compra_dominant = _insert_canonical(conn, "Produto Pred Compra")
        _insert_synonym(conn, compra_dominant, "Produto Pred Compra")
        for idx in range(3):
            _insert_imported(
                conn,
                batch=batch,
                row_index=10 + idx,
                name="Produto Pred Compra",
                class_compra="X",
            )
        _insert_imported(
            conn,
            batch=batch,
            row_index=14,
            name="Produto Pred Compra",
            class_compra_venda="X",
        )

        compra_venda_dominant = _insert_canonical(conn, "Produto Pred Compra/Venda")
        _insert_synonym(conn, compra_venda_dominant, "Produto Pred Compra/Venda")
        _insert_imported(
            conn,
            batch=batch,
            row_index=20,
            name="Produto Pred Compra/Venda",
            class_compra="X",
        )
        for idx in range(4):
            _insert_imported(
                conn,
                batch=batch,
                row_index=21 + idx,
                name="Produto Pred Compra/Venda",
                class_compra_venda="X",
            )

        tie_case = _insert_canonical(conn, "Produto Empate")
        _insert_synonym(conn, tie_case, "Produto Empate")
        for idx in range(2):
            _insert_imported(
                conn,
                batch=batch,
                row_index=30 + idx,
                name="Produto Empate",
                class_compra="X",
            )
        for idx in range(2):
            _insert_imported(
                conn,
                batch=batch,
                row_index=40 + idx,
                name="Produto Empate",
                class_compra_venda="X",
            )

        no_vote_case = _insert_canonical(conn, "Produto Sem Voto")
        _insert_synonym(conn, no_vote_case, "Produto Sem Voto")
        _insert_imported(
            conn,
            batch=batch,
            row_index=50,
            name="Produto Sem Voto",
        )

    payload = build_classification_rules(conn)
    conn.close()

    scopes = payload["scopes"]
    global_scope = scopes["global"]
    canonical_map = global_scope["canonical"]

    def _entry(cid: int):
        return canonical_map[str(cid)]

    assert _entry(compra_only)["canonical_attrs"]["class_tag"] == "COMPRA"
    assert _entry(compra_only)["metrics"]["decision"] == "dominant_compra"
    assert _entry(compra_only)["metrics"]["confidence"] == 1.0

    assert _entry(compra_dominant)["canonical_attrs"]["class_tag"] == "COMPRA"
    assert _entry(compra_dominant)["metrics"]["decision"] == "dominant_compra"
    assert _entry(compra_dominant)["metrics"]["confidence"] == 0.75

    assert _entry(compra_venda_dominant)["canonical_attrs"]["class_tag"] == "COMPRA/VENDA"
    assert _entry(compra_venda_dominant)["metrics"]["decision"] == "dominant_compra_venda"
    assert _entry(compra_venda_dominant)["metrics"]["confidence"] == 0.8

    assert _entry(tie_case)["canonical_attrs"]["class_tag"] == "COMPRA/VENDA"
    assert _entry(tie_case)["metrics"]["decision"] == "tie_default"
    assert _entry(tie_case)["metrics"]["confidence"] == 0.5

    assert _entry(no_vote_case)["canonical_attrs"]["class_tag"] == "COMPRA/VENDA"
    assert _entry(no_vote_case)["metrics"]["decision"] == "no_votes"
    assert _entry(no_vote_case)["metrics"]["confidence"] == 0.0
