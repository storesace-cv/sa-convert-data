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
Criar/validar o schema SQLite para memória de decisões (sem IA externa) e disponibilizar o artefacto `.sql` aplicável no cliente.

# Passos
```bash
source .venv/bin/activate 2>/dev/null || true
python -m tools.init_db  # garante a criação local (opcional)
```

O schema pode ser aplicado manualmente em qualquer ambiente SQLite:

```bash
sqlite3 "$SA_CONVERT_DB" < databases/app/schema.sql
```

# Pós-condições
- Ficheiro `databases/app/schema.sql` sincronizado com o schema usado em produção.
- Base de dados local criada/atualizada conforme necessário (via runner ou aplicação manual do schema).
- SoT atualizado com entrada "110 — DB initialized".
