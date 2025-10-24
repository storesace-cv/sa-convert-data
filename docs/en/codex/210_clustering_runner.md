---
title: "210 — Clustering (propostas de agrupamento)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Limiar T1 por defeito 0.85; pode afinar."
---
# Objetivo
Gerar propostas de clusters a partir do `BATCH` importado.
# Parâmetros
- `BATCH`: o mesmo batch_id usado em 200.
# Passos
```bash
source .venv/bin/activate 2>/dev/null || true
BATCH="${BATCH:-batch-demo}" python - <<'PY'
from app.backend.clustering import propose_clusters
import os, pprint
print(propose_clusters(os.environ["BATCH"]))
PY
```
# Pós-condições
- Entradas em `cluster_proposal` e `cluster_member`.
- SoT atualizado com "210 — Clustering".
