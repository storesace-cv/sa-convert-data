import json, traceback
from typing import Any, Dict
from app.backend.db import init_db, connect, now_utc
from app.backend.learning_importer import learn_from_xlsx
from app.backend.importer_cardex import import_cardex_reformulado
from app.backend.clustering import propose_clusters

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
    def run_clustering(self, batch_id: str, t1: float = 0.85, t2: float = 0.92) -> Dict[str, Any]:
        try:
            return propose_clusters(batch_id, t1, t2)
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
    def approve_cluster(self, cluster_id: int) -> Dict[str, Any]:
        try:
            conn = connect()
            row = conn.execute("""SELECT ir.id, ir.unid_default, ir.unid_compra, ir.unid_stock, ir.unid_log, ir.nome
                                  FROM cluster_member cm
                                  JOIN working_article wa ON wa.id=cm.working_id
                                  JOIN imported_raw ir ON ir.id=wa.raw_id
                                  WHERE cm.cluster_id=? AND cm.selected_by_user=1
                                  ORDER BY cm.score DESC LIMIT 1""", (cluster_id,)).fetchone()
            if not row: return {"ok": False, "error": "Sem membros selecionados"}
            raw_id, ud, uc, us, ul, nome = row
            # canonical = "<nome> (m)" (regra simplista; podes substituir por família/subfamília)
            cur = conn.execute("SELECT id FROM canonical_item WHERE name_canonico=? LIMIT 1", (nome + " (m)",))
            r = cur.fetchone()
            if r: canon_id = r[0]
            else:
                with conn:
                    cur = conn.execute("INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at) VALUES(?,?,?,?)",
                                    (nome + " (m)", "global", "v1", now_utc()))
                    canon_id = cur.lastrowid
            with conn:
                conn.execute("""INSERT INTO approval_decision(cluster_id, canonical_id, artigo_base_raw_id,
                              unit_default, unit_compra, unit_stock, unit_log, decided_at)
                              VALUES(?,?,?,?,?,?,?,?)""", (cluster_id, canon_id, raw_id, ud, uc, us, ul, now_utc()))
            return {"ok": True, "cluster_id": cluster_id, "canonical_id": canon_id}
        except Exception as e:
            return {"ok": False, "error": str(e)}
