from app.backend.db import connect, now_utc
def auto_approve(batch_id: str):
    conn = connect()
    clusters = conn.execute("SELECT id FROM cluster_proposal WHERE batch_id=?", (batch_id,)).fetchall()
    created = 0
    for (cid,) in clusters:
        row = conn.execute("""
            SELECT ir.id, ir.unid_default, ir.unid_compra, ir.unid_stock, ir.unid_log, ir.nome
            FROM cluster_member cm
            JOIN working_article wa ON wa.id=cm.working_id
            JOIN imported_raw ir ON ir.id=wa.raw_id
            WHERE cm.cluster_id=? AND cm.selected_by_user=1
            ORDER BY cm.score DESC LIMIT 1
        """, (cid,)).fetchone()
        if not row:
            continue
        raw_id, ud, uc, us, ul, nome = row
        r = conn.execute("SELECT id FROM canonical_item WHERE name_canonico=? LIMIT 1", (nome + " (m)",)).fetchone()
        if r: canon_id = r[0]
        else:
            cur = conn.execute("INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at) VALUES(?,?,?,?)",
                               (nome + " (m)", "global", "v1", now_utc()))
            canon_id = cur.lastrowid
        conn.execute("""INSERT INTO approval_decision(cluster_id, canonical_id, artigo_base_raw_id,
                        unit_default, unit_compra, unit_stock, unit_log, decided_at)
                        VALUES(?,?,?,?,?,?,?,?)""", (cid, canon_id, raw_id, ud, uc, us, ul, now_utc()))
        created += 1
    conn.commit()
    return {"ok": True, "batch_id": batch_id, "approvals": created}

if __name__ == "__main__":
    import os, json
    b = os.environ.get("BATCH","batch-demo")
    print(json.dumps(auto_approve(b)))
