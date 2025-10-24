---
title: "130 — Executar GUI (pywebview direto)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "GUI deve abrir localmente (sem servidor HTTP)."
---

# Objetivo
Abrir a interface pywebview e testar os botões "Ler SoT" e "Modo Aprendizagem".

# Passos
```bash
source .venv/bin/activate 2>/dev/null || true
python main.py
```

# Pós-condições
- Janela abre; "Ler SoT" devolve index+preview;
- "Modo Aprendizagem" executa e escreve resultado (quando o caminho do ficheiro for válido).
- SoT atualizado com "130 — GUI run".
