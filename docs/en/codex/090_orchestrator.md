---
title: "090 — Orchestrator (095→110→200→210→[auto-approve]→[300])"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotente."
  - "Só exporta se existirem approvals."
params:
  BATCH: "batch-demo"
  FILE_OR_DIR: ""       # "" => databases/import (pega o .xlsx mais recente)
  MODEL: ""             # se vazio, não exporta a menos que seja definido
  AUTO_APPROVE: "0"     # "1" para aprovar tudo automaticamente (não recomendado em produção)
  DO_EXPORT: "0"        # "1" para exportar (requer MODEL definido)
---

# Step 095 — Bootstrap paths
```bash
source .venv/bin/activate 2>/dev/null || true
python tools/init_dirs.py
```

# Step 110 — Init DB
```bash
python -m tools.init_db
```

# Step 200 — Import Cardex
```bash
python - <<'PY'
import os, pprint
from app.backend.importer_cardex import import_cardex_reformulado
BATCH=os.environ.get("BATCH","batch-demo")
FILE_OR_DIR=os.environ.get("FILE_OR_DIR","")
res = import_cardex_reformulado(FILE_OR_DIR, BATCH)
print("== IMPORT =="); pprint.pprint(res)
PY
```

# Step 210 — Clustering
```bash
python - <<'PY'
import os, pprint
from app.backend.clustering import propose_clusters
BATCH=os.environ.get("BATCH","batch-demo")
res = propose_clusters(BATCH)
print("== CLUSTER =="); pprint.pprint(res)
PY
```

# Optional — Auto-approve (if AUTO_APPROVE=1)
```bash
if [ "${AUTO_APPROVE:-0}" = "1" ]; then
  BATCH="${BATCH:-batch-demo}" python tools/auto_approve.py
fi
```

# Optional — Export (if DO_EXPORT=1 and MODEL set)
```bash
if [ "${DO_EXPORT:-0}" = "1" ] && [ -n "${MODEL:-}" ]; then
  python - <<'PY'
import os, pprint
from app.backend.exporter_excel import export_excel_using_model
BATCH=os.environ.get("BATCH","batch-demo")
MODEL=os.environ["MODEL"]
print("== EXPORT ==")
pprint.pprint(export_excel_using_model(MODEL, "", BATCH))
PY
fi
```

# SoT note
- Registar entradas 095/110/200/210 e, se executado, auto-approve e 300/export.
