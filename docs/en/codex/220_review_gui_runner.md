---
title: "220 — Revisão de Clusters (GUI)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "A aprovação de clusters cria linhas em `approval_decision`."
---
# Objetivo
Abrir GUI, rever clusters, selecionar membros e aprovar.
# Passos
```bash
source .venv/bin/activate 2>/dev/null || true
python main.py
# GUI: inserir o BATCH no campo e clicar 'Atualizar';
# marcar/desmarcar itens e clicar 'Aprovar cluster' por cada grupo.
```
# Pós-condições
- Linhas em `approval_decision` por cluster aprovado.
- SoT atualizado com "220 — Review GUI".
