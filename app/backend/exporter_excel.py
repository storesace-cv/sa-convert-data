import os
from openpyxl import load_workbook, Workbook
from app.backend.db import connect
from app.config import EXPORT_DIR, ensure_dirs
def export_excel_using_model(model_path: str, out_path: str | None, batch_id: str):
    ensure_dirs()
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Modelo não encontrado: {model_path}")
    if not out_path or out_path.strip() == "":
        out_path = str(EXPORT_DIR / f"export-{batch_id}.xlsx")
    wb_model = load_workbook(model_path)
    ws_model = wb_model.active
    wb = Workbook()
    ws = wb.active
    for r in range(1,3):
        for c in range(1, ws_model.max_column+1):
            ws.cell(row=r, column=c).value = ws_model.cell(row=r, column=c).value
    for rng in ws_model.merged_cells.ranges:
        if rng.min_row <= 2:
            ws.merge_cells(str(rng))
    conn = connect()
    cur = conn.execute("""
        SELECT a.id, COALESCE(ci.name_canonico, ir.nome || ' (m)'), ir.unid_default, ir.unid_compra, ir.unid_stock, ir.unid_log
        FROM approval_decision a
        JOIN cluster_proposal cp ON cp.id=a.cluster_id
        LEFT JOIN canonical_item ci ON ci.id=a.canonical_id
        LEFT JOIN imported_raw ir ON ir.id=a.artigo_base_raw_id
        WHERE cp.batch_id=?
    """, (batch_id,))
    row = 3
    for rid, name, ud, uc, us, ul in cur.fetchall():
        ws.cell(row=row, column=1).value = None
        ws.cell(row=row, column=2).value = name
        ws.cell(row=row, column=3).value = name
        ws.cell(row=row, column=4).value = name
        ws.cell(row=row, column=15).value = ud
        ws.cell(row=row, column=16).value = uc
        ws.cell(row=row, column=17).value = us
        ws.cell(row=row, column=18).value = ul
        row += 1
    wb.save(out_path)
    return {"ok": True, "rows": row-3, "out": out_path}
