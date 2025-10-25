"""Utilities to seed deterministic datasets for release validation."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any, Dict

from app.backend.audit import log_action
from app.backend.db import now_utc
from app.backend.text_norm import normalize_name


@dataclass(frozen=True)
class SeedSummary:
    """Summary of the seeding operation."""

    batch_id: str
    rows_inserted: int
    approvals_inserted: int
    skipped: bool

    def as_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "rows_inserted": self.rows_inserted,
            "approvals_inserted": self.approvals_inserted,
            "skipped": self.skipped,
        }


def _has_batch(conn: sqlite3.Connection, batch_id: str) -> bool:
    cur = conn.execute(
        """
        SELECT 1
        FROM cluster_proposal
        WHERE batch_id=?
        LIMIT 1
        """,
        (batch_id,),
    )
    return cur.fetchone() is not None


def seed_release_dataset(
    conn: sqlite3.Connection,
    *,
    batch_id: str = "release-batch",
    canonical_label: str = "MANTEIGA (m)",
    import_user: str = "release-bot",
) -> SeedSummary:
    """Populate the minimal dataset required for export validation."""

    if _has_batch(conn, batch_id):
        return SeedSummary(batch_id, rows_inserted=0, approvals_inserted=0, skipped=True)

    now = now_utc()
    with conn:
        cur = conn.execute(
            """
            INSERT INTO imported_raw(
                batch_id, row_index, cod_artigo, cod_barras, nome, nome_norm,
                desc1, desc2, desc_curta1, desc_curta2,
                categoria, familia, subfamilia,
                class_venda,
                unid_default, unid_compra, unid_stock, unid_log,
                estado, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                batch_id,
                1,
                "123",
                "789",
                canonical_label,
                normalize_name(canonical_label),
                canonical_label,
                canonical_label,
                canonical_label,
                canonical_label,
                "Categoria X",
                "Familia Y",
                "Subfamilia Z",
                "X",
                "KG",
                "KG",
                "KG",
                "KG",
                "ATIVO",
                now,
            ),
        )
        raw_id = cur.lastrowid

        cur = conn.execute(
            """
            INSERT INTO cluster_proposal(batch_id, label_sugerido, created_at)
            VALUES (?,?,?)
            """,
            (batch_id, canonical_label, now),
        )
        cluster_id = cur.lastrowid

        cur = conn.execute(
            """
            INSERT INTO working_article(
                batch_id, raw_id, nome_norm, nome_sem_stop,
                quantidade_valor, quantidade_total, quantidade_unidade,
                quantidade_tipo, quantidade_numero,
                flag_com_sal, flag_sem_sal, marca_detectada
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                batch_id,
                raw_id,
                normalize_name(canonical_label),
                normalize_name(canonical_label),
                None,
                None,
                None,
                None,
                None,
                0,
                0,
                None,
            ),
        )
        working_id = cur.lastrowid

        conn.execute(
            """
            INSERT INTO cluster_member(cluster_id, working_id, score, selected_by_user)
            VALUES (?,?,?,?)
            """,
            (cluster_id, working_id, 0.9, 0),
        )

        conn.execute(
            """
            INSERT INTO approval_decision(
                cluster_id, canonical_id, artigo_base_raw_id,
                unit_default, unit_compra, unit_stock, unit_log, decided_at
            ) VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                cluster_id,
                None,
                raw_id,
                "UN",
                "CX",
                "UN",
                "UN",
                now,
            ),
        )

        log_action(
            conn,
            f"batch:{batch_id}",
            "cardex_import",
            {
                "batch_id": batch_id,
                "file": "import.xlsx",
                "imported_rows": 1,
                "working_rows": 1,
                "user": import_user,
            },
            ts=now,
        )

    return SeedSummary(batch_id, rows_inserted=1, approvals_inserted=1, skipped=False)


__all__ = ["SeedSummary", "seed_release_dataset"]
