---
title: "100 — Scaffold da aplicação (pywebview direto)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotente: ficheiros já presentes não devem ser reescritos sem motivo."
  - "Registar no SoT no fim."
---

# Objetivo
Confirmar a presença do esqueleto da app pywebview (frontend+backend) e dos utilitários.

# Passos
```bash
ls -1 app/frontend app/backend tools rules main.py
python -V
```

# Pós-condições
- Existem: `main.py`, `app/frontend/*`, `app/backend/*`, `tools/init_db.py`, `rules/domain.yml`.
- SoT atualizado com uma entrada "100 — Scaffold".
