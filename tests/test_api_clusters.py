import importlib

import pytest

from app.backend.text_norm import normalize_name


def _setup_modules(tmp_path, monkeypatch):
    db_path = tmp_path / "clusters.db"
    monkeypatch.setenv("SA_CONVERT_DB", str(db_path))

    import app.backend.db as db_module
    import app.backend.api as api_module

    importlib.reload(db_module)
    importlib.reload(api_module)

    db_module.init_db()
    monkeypatch.setattr(
        api_module,
        'load_prohibitions',
        lambda scope='global': [('COM SAL', 'SEM SAL')],
    )
    return db_module, api_module


def _insert_article(conn, batch_id, nome, *, unidades=None, quantidade=None, flags=None, marca=None):
    unidades = unidades or {}
    quantidade = quantidade or {}
    flags = flags or {}

    term_norm = normalize_name(nome)

    cur = conn.execute(
        """
        INSERT INTO imported_raw(
            batch_id, row_index, nome, nome_norm,
            unid_default, unid_compra, unid_stock, unid_log,
            created_at
        ) VALUES(?,?,?,?,?,?,?,?,datetime('now'))
        """,
        (
            batch_id,
            1,
            nome,
            term_norm,
            unidades.get('default'),
            unidades.get('compra'),
            unidades.get('stock'),
            unidades.get('log'),
        ),
    )
    raw_id = cur.lastrowid

    conn.execute(
        """
        INSERT INTO working_article(
            batch_id, raw_id, nome_norm, nome_sem_stop,
            quantidade_valor, quantidade_total, quantidade_unidade,
            quantidade_tipo, quantidade_numero,
            flag_com_sal, flag_sem_sal, marca_detectada
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            batch_id,
            raw_id,
            term_norm,
            term_norm,
            quantidade.get('valor'),
            quantidade.get('total'),
            quantidade.get('unidade'),
            quantidade.get('tipo'),
            quantidade.get('numero'),
            1 if flags.get('com_sal') else 0,
            1 if flags.get('sem_sal') else 0,
            marca,
        ),
    )

    cur = conn.execute("SELECT id FROM working_article WHERE raw_id=?", (raw_id,))
    working_id = cur.fetchone()[0]
    return raw_id, working_id


def _create_cluster(conn, batch_id, members):
    cur = conn.execute(
        """
        INSERT INTO cluster_proposal(batch_id, label_sugerido, created_at)
        VALUES(?,?,datetime('now'))
        """,
        (batch_id, f"Cluster {batch_id}",),
    )
    cluster_id = cur.lastrowid

    for working_id, score, selected in members:
        conn.execute(
            """
            INSERT INTO cluster_member(cluster_id, working_id, score, selected_by_user)
            VALUES(?,?,?,?)
            """,
            (cluster_id, working_id, score, 1 if selected else 0),
        )

    return cluster_id


def test_list_clusters_enriches_members(tmp_path, monkeypatch):
    db_module, api_module = _setup_modules(tmp_path, monkeypatch)
    conn = db_module.connect()
    try:
        with conn:
            _, w1 = _insert_article(
                conn,
                'batch-1',
                'Manteiga com sal 250g',
                unidades={'default': 'KG', 'compra': 'KG', 'stock': 'KG', 'log': 'KG'},
                quantidade={'total': 250, 'unidade': 'G', 'tipo': 'MASS'},
                flags={'com_sal': True},
                marca='BRAVA',
            )
            _, w2 = _insert_article(
                conn,
                'batch-1',
                'Manteiga sem sal 200g',
                unidades={'default': 'G', 'compra': 'G', 'stock': 'G', 'log': 'G'},
                quantidade={'total': 200, 'unidade': 'G', 'tipo': 'MASS'},
                flags={'sem_sal': True},
                marca=None,
            )
            _create_cluster(
                conn,
                'batch-1',
                [
                    (w1, 0.96, True),
                    (w2, 0.88, False),
                ],
            )

        api = api_module.ExposedAPI()
        result = api.list_clusters('batch-1', scope='global')
        assert result['ok'] is True
        assert result['prohibitions'] and ['COM SAL', 'SEM SAL'] in result['prohibitions']

        cluster_payload = result['items'][0]
        assert 'unit_options' in cluster_payload
        assert 'suggested_units' in cluster_payload
        assert cluster_payload['unit_options']['unit_default'] == ['G', 'KG']

        member_payload = next(item for item in cluster_payload['members'] if item['id'] == w1)
        assert member_payload['flags'] == ['COM SAL']
        assert 'COM SAL' in member_payload['blocking_tokens']
        assert member_payload['marca'] == 'BRAVA'
        assert member_payload['quantidade']['unidade'] == 'G'
        assert cluster_payload['suggested_units']['unit_default'] == 'KG'
    finally:
        conn.close()


def test_approve_cluster_blocks_prohibitions(tmp_path, monkeypatch):
    db_module, api_module = _setup_modules(tmp_path, monkeypatch)
    conn = db_module.connect()
    try:
        with conn:
            _, w1 = _insert_article(
                conn,
                'batch-2',
                'Caldo com sal',
                unidades={'default': 'L'},
                flags={'com_sal': True},
            )
            _, w2 = _insert_article(
                conn,
                'batch-2',
                'Caldo sem sal',
                unidades={'default': 'L'},
                flags={'sem_sal': True},
            )
            cluster_id = _create_cluster(
                conn,
                'batch-2',
                [
                    (w1, 0.91, True),
                    (w2, 0.9, True),
                ],
            )

        api = api_module.ExposedAPI()
        result = api.approve_cluster(cluster_id, scope='global')
        assert result['ok'] is False
        assert 'Regras de bloqueio' in result['error']
    finally:
        conn.close()


def test_approve_cluster_respects_units(tmp_path, monkeypatch):
    db_module, api_module = _setup_modules(tmp_path, monkeypatch)
    conn = db_module.connect()
    try:
        with conn:
            _, working_id = _insert_article(
                conn,
                'batch-3',
                'Leite integral 1L',
                unidades={'default': 'L', 'compra': 'L', 'stock': 'L', 'log': 'L'},
                quantidade={'total': 1, 'unidade': 'L', 'tipo': 'VOLUME'},
            )
            cluster_id = _create_cluster(
                conn,
                'batch-3',
                [(working_id, 0.97, True)],
            )
    finally:
        conn.close()

    api = api_module.ExposedAPI()
    custom_units = {
        'unit_default': 'CX',
        'unit_compra': 'CX',
        'unit_stock': 'CX',
        'unit_log': 'CX',
    }
    result = api.approve_cluster(cluster_id, scope='global', units=custom_units)
    assert result['ok'] is True

    check_conn = db_module.connect()
    try:
        cur = check_conn.execute(
            "SELECT unit_default, unit_compra, unit_stock, unit_log FROM approval_decision WHERE cluster_id=?",
            (cluster_id,),
        )
        stored = cur.fetchone()
        assert stored == ('CX', 'CX', 'CX', 'CX')
    finally:
        check_conn.close()


def test_split_cluster_moves_members(tmp_path, monkeypatch):
    db_module, api_module = _setup_modules(tmp_path, monkeypatch)
    conn = db_module.connect()
    try:
        with conn:
            _, w1 = _insert_article(conn, 'batch-4', 'Produto A', unidades={'default': 'UN'})
            _, w2 = _insert_article(conn, 'batch-4', 'Produto B', unidades={'default': 'UN'})
            _, w3 = _insert_article(conn, 'batch-4', 'Produto C', unidades={'default': 'UN'})
            cluster_id = _create_cluster(
                conn,
                'batch-4',
                [
                    (w1, 0.95, True),
                    (w2, 0.9, True),
                    (w3, 0.85, False),
                ],
            )
    finally:
        conn.close()

    api = api_module.ExposedAPI()
    result = api.split_cluster(cluster_id, [w3])
    assert result['ok'] is True
    assert result['moved'] == 1

    check_conn = db_module.connect()
    try:
        cur = check_conn.execute(
            "SELECT cluster_id FROM cluster_member WHERE working_id=?",
            (w3,),
        )
        moved_cluster_id = cur.fetchone()[0]
        assert moved_cluster_id == result['new_cluster_id']

        cur = check_conn.execute(
            "SELECT COUNT(*) FROM cluster_member WHERE cluster_id=?",
            (cluster_id,),
        )
        remaining = cur.fetchone()[0]
        assert remaining == 2
    finally:
        check_conn.close()
