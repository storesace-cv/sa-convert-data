import json, traceback
from typing import Any, Dict

from app.backend.audit import log_action
from app.backend.db import connect, init_db, now_utc
from app.backend.learning_importer import learn_from_xlsx
from app.backend.importer_cardex import import_cardex_reformulado
from app.backend.clustering import propose_clusters
from app.backend.text_norm import normalize_name

SOT_INDEX = "docs/en/codex/architecture/app-status-index.json"
SOT_TEXT = "docs/en/codex/architecture/app-status2gpt.md"

class ExposedAPI:
    # SoT
    def read_sot(self) -> Dict[str, Any]:
        try:
            with open(SOT_INDEX, "r") as f:
                idx = json.load(f)
            with open(SOT_TEXT, "r") as f:
                txt = f.read()
            return {"index": idx, "text_len": len(txt), "text_preview": txt[:4000]}
        except Exception as e:
            return {"error": str(e)}

    # Learning
    def learning_import(self, xlsx_path: str, scope: str = "global") -> Dict[str, Any]:
        try:
            init_db()
            result = learn_from_xlsx(xlsx_path, scope)
            return result
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc()}

    # Import cardex
    def import_cardex(self, xlsx_path: str, batch_id: str) -> Dict[str, Any]:
        try:
            return import_cardex_reformulado(xlsx_path, batch_id)
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Clustering
    def run_clustering(
        self,
        batch_id: str,
        scope: str = "global",
        t1: float = 0.85,
        t2: float = 0.92,
    ) -> Dict[str, Any]:
        try:
            return propose_clusters(batch_id, scope, t1, t2)
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Review list
    def list_clusters(self, batch_id: str) -> Dict[str, Any]:
        try:
            conn = connect()
            cur = conn.execute("SELECT id, label_sugerido FROM cluster_proposal WHERE batch_id=?", (batch_id,))
            items = []
            for cid, lbl in cur.fetchall():
                cm = conn.execute("""SELECT cm.working_id, cm.score, cm.selected_by_user, ir.nome
                                      FROM cluster_member cm
                                      JOIN working_article wa ON wa.id=cm.working_id
                                      JOIN imported_raw ir ON ir.id=wa.raw_id
                                      WHERE cm.cluster_id=?
                                  """, (cid,)).fetchall()
                members = [{"id": wid, "score": float(sc or 0), "selected": bool(sel), "nome": nome} for (wid, sc, sel, nome) in cm]
                items.append({"id": cid, "label": lbl, "members": members})
            return {"ok": True, "items": items}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Toggle member
    def select_member(self, cluster_id: int, working_id: int, selected: bool) -> Dict[str, Any]:
        try:
            conn = connect()
            with conn:
                conn.execute("UPDATE cluster_member SET selected_by_user=? WHERE cluster_id=? AND working_id=?", (1 if selected else 0, cluster_id, working_id))
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Approve cluster
    def approve_cluster(self, cluster_id: int, scope: str = "global") -> Dict[str, Any]:
        try:
            conn = connect()
            row = conn.execute(
                """
                SELECT ir.id, ir.unid_default, ir.unid_compra, ir.unid_stock, ir.unid_log, ir.nome
                FROM cluster_member cm
                JOIN working_article wa ON wa.id=cm.working_id
                JOIN imported_raw ir ON ir.id=wa.raw_id
                WHERE cm.cluster_id=? AND cm.selected_by_user=1
                ORDER BY cm.score DESC LIMIT 1
                """,
                (cluster_id,),
            ).fetchone()
            if not row:
                return {"ok": False, "error": "Sem membros selecionados"}

            raw_id, ud, uc, us, ul, nome = row
            term_norm = normalize_name(nome)
            lookup_scopes = [scope] if scope == "global" else [scope, "global"]

            canonical_id: int | None = None
            canonical_label: str | None = None
            for sc in lookup_scopes:
                cur = conn.execute(
                    "SELECT canonical_id FROM canonical_synonym WHERE scope=? AND term_norm=? LIMIT 1",
                    (sc, term_norm),
                )
                match = cur.fetchone()
                if match and match[0] is not None:
                    canonical_id = match[0]
                    break

            pattern_units: Dict[str, str | None] = {}
            base_hint: str | None = None
            for sc in lookup_scopes:
                cur = conn.execute(
                    """
                    SELECT canonical_id, unit_default, unit_compra, unit_stock, unit_log, base_article_hint
                    FROM group_pattern
                    WHERE scope=? AND fingerprint=?
                    LIMIT 1
                    """,
                    (sc, term_norm),
                )
                match = cur.fetchone()
                if match:
                    gp_canon, gp_ud, gp_uc, gp_us, gp_ul, gp_hint = match
                    pattern_units = {
                        "unit_default": gp_ud,
                        "unit_compra": gp_uc,
                        "unit_stock": gp_us,
                        "unit_log": gp_ul,
                    }
                    base_hint = gp_hint
                    if canonical_id is None and gp_canon is not None:
                        canonical_id = gp_canon
                    break

            if canonical_id is not None:
                cur = conn.execute(
                    "SELECT name_canonico FROM canonical_item WHERE id=?",
                    (canonical_id,),
                )
                row_label = cur.fetchone()
                if row_label:
                    canonical_label = row_label[0]

            with conn:
                if canonical_id is None:
                    canonical_label = canonical_label or f"{nome} (m)"
                    cur = conn.execute(
                        """
                        INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at)
                        VALUES(?,?,?,?)
                        """,
                        (canonical_label, scope, "v1", now_utc()),
                    )
                    canonical_id = cur.lastrowid
                else:
                    canonical_label = canonical_label or f"{nome} (m)"

                final_ud = ud or pattern_units.get("unit_default")
                final_uc = uc or pattern_units.get("unit_compra")
                final_us = us or pattern_units.get("unit_stock")
                final_ul = ul or pattern_units.get("unit_log")

                conn.execute(
                    """
                    INSERT INTO approval_decision(
                        cluster_id, canonical_id, artigo_base_raw_id,
                        unit_default, unit_compra, unit_stock, unit_log, decided_at
                    ) VALUES(?,?,?,?,?,?,?,?)
                    """,
                    (
                        cluster_id,
                        canonical_id,
                        raw_id,
                        final_ud,
                        final_uc,
                        final_us,
                        final_ul,
                        now_utc(),
                    ),
                )

                log_action(
                    conn,
                    scope,
                    "cluster_approved",
                    {
                        "cluster_id": cluster_id,
                        "canonical_id": canonical_id,
                        "canonical_label": canonical_label,
                        "term_norm": term_norm,
                        "base_hint": base_hint,
                    },
                )

            return {"ok": True, "cluster_id": cluster_id, "canonical_id": canonical_id}
        except Exception as e:
            return {"ok": False, "error": str(e)}
