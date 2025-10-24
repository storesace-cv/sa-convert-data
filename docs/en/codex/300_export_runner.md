---
title: "300 — Exportação Excel (modelo ipsis verbis)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Nunca alterar o cabeçalho de 2 linhas do modelo."
---
# Objetivo
Exportar o Excel final copiando o cabeçalho do modelo e preenchendo linhas aprovadas (código artigo vazio).
# Parâmetros
- `MODEL`: caminho do modelo `CardexArtigos (carpe diem).xlsx`.
- `OUT` (opcional): caminho de saída. Se vazio, grava em `databases/export/export-<BATCH>.xlsx`.
- `BATCH`: batch id.
```bash
source .venv/bin/activate 2>/dev/null || true
MODEL="${MODEL:?define o caminho do modelo}" OUT="${OUT:-}" BATCH="${BATCH:-batch-demo}" python - <<'PY'
from app.backend.exporter_excel import export_excel_using_model
import os, pprint
print(export_excel_using_model(os.environ["MODEL"], os.environ.get("OUT",""), os.environ["BATCH"]))
PY
```
# Pós-condições
- Ficheiro Excel criado conforme o modelo, com os dados aprovados.
- SoT atualizado com "300 — Export".
