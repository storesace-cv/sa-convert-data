import os, glob
from typing import Dict, Any
from openpyxl import load_workbook
from app.backend.db import connect, init_db, now_utc
from app.backend.text_norm import normalize_name
from app.config import IMPORT_DIR, ensure_dirs
REQUIRED_HEADERS = ["nome"]
def _pick_xlsx(path_or_dir: str) -> str:
    ensure_dirs()
    if not path_or_dir or path_or_dir.strip() == "":
        path_or_dir = str(IMPORT_DIR)
    if os.path.isdir(path_or_dir):
        files = sorted(glob.glob(os.path.join(path_or_dir, "*.xlsx")), key=os.path.getmtime, reverse=True)
        if not files:
            raise FileNotFoundError(f"Nenhum .xlsx encontrado em {path_or_dir}")
        return files[0]
    else:
        if not os.path.exists(path_or_dir):
            raise FileNotFoundError(f"Ficheiro não encontrado: {path_or_dir}")
        return path_or_dir
def _map_headers(ws):
    headers = [ (c.value or "") if c.value is not None else "" for c in next(ws.iter_rows(min_row=1, max_row=1)) ]
    return { str(h).strip().lower(): idx for idx, h in enumerate(headers) }
def import_cardex_reformulado(xlsx_path: str | None, batch_id: str) -> Dict[str, Any]:
    init_db()
    xlsx_path = _pick_xlsx(xlsx_path or "")
    wb = load_workbook(filename=xlsx_path, read_only=True, data_only=True)
    ws = wb.active
    hm = _map_headers(ws)
    for req in REQUIRED_HEADERS:
        if req not in hm:
            raise KeyError(f"Cabeçalho obrigatório ausente: {req}")
    get = lambda name: hm.get(name, None)
    c_nome = get("nome")
    c_ud = get("unid_default")
    c_uc = get("unid_compra")
    c_us = get("unid_stock")
    c_ul = get("unid_logistica")
    conn = connect()
    inserted = 0
    w_inserted = 0
    with conn:
        for i, row in enumerate(ws.iter_rows(min_row=2), start=2):
            nome = row[c_nome].value if c_nome is not None and row[c_nome] else ""
            if not nome: 
                continue
            nome = str(nome)
            nome_norm = normalize_name(nome)
            ud = row[c_ud].value if c_ud is not None and row[c_ud] else None
            uc = row[c_uc].value if c_uc is not None and row[c_uc] else None
            us = row[c_us].value if c_us is not None and row[c_us] else None
            ul = row[c_ul].value if c_ul is not None and row[c_ul] else None
            cur = conn.execute("""INSERT INTO imported_raw
              (batch_id, row_index, nome, nome_norm, desc1, desc2, unid_default, unid_compra, unid_stock, unid_log, created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
              (batch_id, i, nome, nome_norm, nome, nome, ud, uc, us, ul, now_utc()))
            raw_id = cur.lastrowid
            inserted += 1
            conn.execute("""INSERT INTO working_article(batch_id, raw_id, nome_norm) VALUES (?,?,?)""", (batch_id, raw_id, nome_norm))
            w_inserted += 1
    return { "ok": True, "batch_id": batch_id, "imported_rows": inserted, "working_rows": w_inserted, "file_used": xlsx_path }
