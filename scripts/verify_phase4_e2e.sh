#!/usr/bin/env bash
set -euo pipefail

# Debug verbosity in CI
[[ "${CI:-}" == "true" ]] && set -x

echo "🧪 Phase 4 — E2E export smoke (DB→export→artefacts→audit log)"

WORKDIR="$(mktemp -d -t sa_e2e_XXXX)"
DB="${WORKDIR}/data.db"
DBDIR="${WORKDIR}/dbdir"
EXPORTS="${WORKDIR}/exports"
BATCH="batch-smoke"

# Make artifacts dir in the workspace to be uploaded by CI (even on failure)
ARTIF_DIR="${GITHUB_WORKSPACE:-$PWD}/e2e_artifacts"
mkdir -p "${ARTIF_DIR}"

collect_artifacts() {
  echo "📦 Collecting E2E artifacts..."
  # Copy exports if they exist
  if [[ -d "${EXPORTS}" ]]; then
    rsync -a --delete "${EXPORTS}/" "${ARTIF_DIR}/exports/"
  fi
  # Copy DB for inspection
  if [[ -f "${DB}" ]]; then
    mkdir -p "${ARTIF_DIR}/db"
    cp -f "${DB}" "${ARTIF_DIR}/db/data.db" || true
  fi
  # Copy the temp workdir structure listing
  { echo "WORKDIR=${WORKDIR}"; echo; echo "Tree:"; command -v tree >/dev/null 2>&1 && tree -a "${WORKDIR}" || find "${WORKDIR}" -maxdepth 3 -print; } > "${ARTIF_DIR}/WORKDIR_INFO.txt" || true
  # Record environment info
  {
    echo "Python:"; python --version || true
    echo "Pip freeze (top 50):"; pip freeze | head -n 50 || true
    echo; echo "Locale:"; locale || true
  } > "${ARTIF_DIR}/ENV_INFO.txt" || true
}
trap collect_artifacts EXIT

export SA_CONVERT_DB="${DB}"
export SA_CONVERT_DB_DIR="${DBDIR}"
export SA_CONVERT_EXPORT_DIR="${EXPORTS}"
export SA_CONVERT_USER="${USER:-local-user}"

if [[ -d .venv ]]; then source .venv/bin/activate || true; fi

python - "$BATCH" <<'PY'
import sys
batch_id = sys.argv[1]
from app.backend import db as db_module
db_module.init_db()
conn = db_module.connect()
now = db_module.now_utc()
with conn:
    cur = conn.execute("""
      INSERT INTO imported_raw(
        batch_id, row_index, cod_artigo, cod_barras, nome, nome_norm,
        desc1, desc2, categoria, class_venda,
        unid_default, unid_compra, unid_stock, unid_log,
        estado, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
      (batch_id,1,"A1","B1","Nome","nome","Desc","Desc","Categoria","X","UN","UN","UN","UN","ATIVO",now)
    )
    raw_id = cur.lastrowid
    cur = conn.execute("""INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at)
                          VALUES (?,?,?,?)""", ("Canon","global","v1",now))
    canonical_id = cur.lastrowid
    cur = conn.execute("""INSERT INTO cluster_proposal(batch_id, label_sugerido, created_at)
                          VALUES (?,?,?)""", (batch_id,"Sugestao",now))
    cluster_id = cur.lastrowid
    cur = conn.execute("""INSERT INTO working_article(
        batch_id, raw_id, nome_norm, nome_sem_stop,
        quantidade_valor, quantidade_total, quantidade_unidade,
        quantidade_tipo, quantidade_numero,
        flag_com_sal, flag_sem_sal, marca_detectada
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
      (batch_id, raw_id, "nome","nome", None,None,None,None,None, 0,0,None)
    )
    working_id = cur.lastrowid
    conn.execute("""INSERT INTO cluster_member(cluster_id, working_id, score, selected_by_user)
                    VALUES (?,?,?,?)""", (cluster_id, working_id, 0.9, 1))
    conn.execute("""INSERT INTO approval_decision(
        cluster_id, canonical_id, artigo_base_raw_id,
        unit_default, unit_compra, unit_stock, unit_log, decided_at
      ) VALUES (?,?,?,?,?,?,?,?)""",
      (cluster_id, canonical_id, raw_id, "UN","CX","UN","UN", now))
conn.close()
print("DB ready for batch:", batch_id)
PY

python tools/export_validate.py --batch-id "${BATCH}" --model-path "databases/models/export template.xlsx" --verbose

XLSX="${EXPORTS}/${BATCH}/export_${BATCH}.xlsx"
CSV="${EXPORTS}/${BATCH}/export_${BATCH}.csv"
REPORT="${EXPORTS}/${BATCH}/report_${BATCH}.json"
export XLSX CSV REPORT

test -f "${XLSX}" || { echo "❌ missing XLSX"; exit 1; }
test -f "${CSV}"  || { echo "❌ missing CSV"; exit 1; }
test -f "${REPORT}" || { echo "❌ missing report JSON"; exit 1; }

python - <<'PY'
import os, json
data = json.loads(open(os.environ["REPORT"], "r", encoding="utf-8").read())
assert data["batch_id"], "missing batch_id"
assert data["validation"]["total_rows"] >= 1, "total_rows < 1"
print("Report OK:", data["validation"])
PY

python - <<'PY'
import os
from openpyxl import load_workbook
wb = load_workbook(os.environ["XLSX"])
ws = wb.active
assert ws.max_row >= 3, f"Expected ws.max_row>=3, got {ws.max_row}"
wb.close()
print("XLSX OK: rows", ws.max_row)
PY

python - <<'PY'
from app.backend import db as db_module
conn = db_module.connect()
cur = conn.execute("SELECT action, payload_json FROM decision_log WHERE action='export_validation'")
row = cur.fetchone()
assert row is not None, "no decision_log entry for export_validation"
print("decision_log OK")
PY

echo "✅ E2E export smoke OK"
echo "🗂  Workdir: ${WORKDIR}"
