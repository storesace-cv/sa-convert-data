---
title: "200 — Importar Cardex (reformulado)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotente: importar com um batch_id único por ficheiro."
---
# Objetivo
Importar o ficheiro do cliente para `imported_raw` / `working_article` utilizando apenas o campo **nome** (desc1/desc2 = nome).
# Parâmetros
- `FILE_OR_DIR` (opcional): ficheiro **ou** diretório. Se diretório (ou vazio), usa o .xlsx mais recente encontrado. Por defeito: `databases/import`.
- `BATCH`: identificador único (ex: `batch-2025-10-24`).
# Passos
```bash
source .venv/bin/activate 2>/dev/null || true
FILE_OR_DIR="${FILE_OR_DIR:-}" BATCH="${BATCH:-batch-demo}" python - <<'PY'
from app.backend.importer_cardex import import_cardex_reformulado
import os, pprint
res = import_cardex_reformulado(os.environ.get("FILE_OR_DIR",""), os.environ["BATCH"])
pprint.pprint(res)
PY
```
# Pós-condições
- Linhas inseridas em `imported_raw` e `working_article` para `BATCH`.
- SoT atualizado com "200 — Cardex import".
