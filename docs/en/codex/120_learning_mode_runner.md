---
title: "120 — Modo Aprendizagem (import de exemplos)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "O modo aprendizagem não exporta nada — apenas alimenta as tabelas de conhecimento."
---

# Objetivo
Importar o ficheiro de aprendizagem e alimentar `canonical_item`, `canonical_synonym`, `class_map` (e padrões).

# Parâmetros
- `SCOPE` (opcional): por defeito "global".
- `FILE`: caminho para `ingredientes - aprendizagem.xlsx` no disco local.

# Passos (exemplo)
```bash
source .venv/bin/activate 2>/dev/null || true
python - <<'PY'
from app.backend.learning_importer import learn_from_xlsx
import os
FILE = os.environ.get("FILE", "/Users/jorgepeixinho/Documents/NetxCloud/projectos/.../ingredientes - aprendizagem.xlsx")
SCOPE = os.environ.get("SCOPE", "global")
print(learn_from_xlsx(FILE, SCOPE))
PY
```

# Pós-condições
- Registos inseridos/atualizados em `canonical_item`, `canonical_synonym`, `class_map`.
- SoT atualizado com "120 — Learning import".
