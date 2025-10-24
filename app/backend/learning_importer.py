import os, json
from typing import Dict, Any
from openpyxl import load_workbook

from app.backend.db import connect, init_db, now_utc
from app.backend.text_norm import normalize_name

def learn_from_xlsx(xlsx_path: str, scope: str = "global") -> Dict[str, Any]:
    if not os.path.exists(xlsx_path):
        raise FileNotFoundError(f"Ficheiro não encontrado: {xlsx_path}")
    init_db()
    wb = load_workbook(filename=xlsx_path, read_only=True, data_only=True)
    ws = wb.active

    headers = [ (c.value or "") if c.value is not None else "" for c in next(ws.iter_rows(min_row=1, max_row=1)) ]
    header_map = { str(h).strip().lower(): idx for idx, h in enumerate(headers) }

    def col(name):
        key = name.lower()
        if key in header_map:
            return header_map[key]
        raise KeyError(f"Coluna obrigatória não encontrada: {name}")

    col_nome = col("nome")
    col_fam = header_map.get("familia", None)
    col_sub = header_map.get("subfamilia", None)

    conn = connect()
    inserted = 0
    updated_class = 0
    created_canons = 0
    with conn:
        for row in ws.iter_rows(min_row=2):
            nome = row[col_nome].value if row[col_nome] else ""
            if not nome:
                continue
            term_norm = normalize_name(str(nome))
            familia = (row[col_fam].value if (col_fam is not None and row[col_fam]) else "") if col_fam is not None else ""
            subfamilia = (row[col_sub].value if (col_sub is not None and row[col_sub]) else "") if col_sub is not None else ""

            canonical_label = canonical_from_family(familia, subfamilia, term_norm)

            cur = conn.execute("SELECT id FROM canonical_item WHERE name_canonico=? AND scope=?", (canonical_label, scope))
            r = cur.fetchone()
            if r:
                canonical_id = r[0]
            else:
                cur = conn.execute("INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at) VALUES(?,?,?,?)",
                                   (canonical_label, scope, "v1", now_utc()))
                canonical_id = cur.lastrowid
                created_canons += 1

            try:
                conn.execute("INSERT INTO canonical_synonym(scope, term_norm, canonical_id, confidence, source) VALUES(?,?,?,?,?)",
                             (scope, term_norm, canonical_id, 1.0, "learning_file"))
                inserted += 1
            except Exception:
                conn.execute("UPDATE canonical_synonym SET canonical_id=?, confidence=1.0, source='learning_file' WHERE scope=? AND term_norm=?",
                             (canonical_id, scope, term_norm))

            if familia or subfamilia:
                try:
                    conn.execute("INSERT INTO class_map(scope, familia, subfamilia, canonical_label, support_count, source) VALUES(?,?,?,?,?,?)",
                                 (scope, familia or "", subfamilia or "", canonical_label, 1, "learning_file"))
                    updated_class += 1
                except Exception:
                    conn.execute("UPDATE class_map SET canonical_label=?, support_count=support_count+1 WHERE scope=? AND familia=? AND subfamilia=?",
                                 (canonical_label, scope, familia or "", subfamilia or ""))

    return {"ok": True, "file": xlsx_path, "scope": scope, "synonyms_upserted": inserted, "canonical_created": created_canons, "class_map_updates": updated_class}

FAM_RULES = {
    "CARNE": {"VACA": "CARNE DE VACA (m)", "PORCO": "CARNE DE PORCO (m)", "_default": "CARNE (m)"},
    "LATICINIOS": {"MANTEIGA": "MANTEIGA (m)", "_default": "LATICINIOS (m)"},
    "FRUTA": {"_default": "FRUTAS (m)"},
    "VEGETAL": {"_default": "VEGETAIS (m)"},
    "FUMADOS": {"_default": "FUMADOS (m)"},
}

def canonical_from_family(familia: str, subfamilia: str, term_norm: str) -> str:
    fam = (familia or "").strip().upper()
    sub = (subfamilia or "").strip().upper()
    if fam in FAM_RULES:
        submap = FAM_RULES[fam]
        if sub and sub in submap:
            return submap[sub]
        if "_default" in submap:
            return submap["_default"]
    head = (term_norm.split(" ") or ["ITEM"])[0]
    return f"{head} (m)"
