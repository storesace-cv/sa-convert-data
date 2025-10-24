---
title: "095 — Bootstrap de diretórios padrão"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotente."
---
# Objetivo
Garantir as pastas `databases/app`, `databases/import`, `databases/export`.
# Passos
```bash
source .venv/bin/activate 2>/dev/null || true
python tools/init_dirs.py
```
# Pós-condições
- Pastas criadas se não existirem.
- SoT atualizado com "095 — paths bootstrap".
