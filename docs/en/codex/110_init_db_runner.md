---
title: "110 — Inicializar Base de Dados (SQLite schema)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotente: correr várias vezes sem erro."
---

# Objetivo
Criar/validar o schema SQLite para memória de decisões (sem IA externa).

# Passos
```bash
source .venv/bin/activate 2>/dev/null || true
python tools/init_db.py
```

# Pós-condições
- Ficheiro `data.sqlite` criado na raiz do repo (ou conforme var `SA_CONVERT_DB`).
- SoT atualizado com entrada "110 — DB initialized".
