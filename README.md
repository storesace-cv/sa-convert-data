# sa-convert-data

**Python-based data conversion and learning engine**  
GUI built with **pywebview (direct mode)** — runs locally, no web server required.

---

## 📘 Overview

`sa-convert-data` is a modular engine designed to **convert, classify, and learn** from heterogeneous data sources — typically article cards, inventory items, and pricing data extracted from retail/restaurant management systems.

It operates in *learning mode* and supports continuous improvement through Codex-based runners.

---

## ⚙️ Architecture

- **Interface:** pywebview (direct)  
- **Database:** SQLite (`databases/app/data.db`)  
- **Environment:** macOS (Apple Silicon ready)  
- **Repository:** `git@github.com:storesace-cv/sa-convert-data.git`  
- **Branch (user):** `my-sa-convert-data`

---

## 🧠 Source of Truth (SoT)

The application status and changelog are managed under:

- `docs/en/codex/architecture/app-status-index.json`  
- `docs/en/codex/architecture/app-status2gpt.md`

### Current SoT State (as of 2025-10-24T18:50:44Z)

Tabela abaixo destaca as 12 entradas mais recentes registradas no SoT.

| Runner | Description | Summary | Date |
|---------|--------------|----------|------|
| Docs | Roadmap | Adicionado roadmap detalhado com etapas planeadas. | 2025-10-24 |
| Docs | README refresh | Atualizado README com documentação abrangente do projecto. | 2025-10-24 |
| Merge PR #12 | Scoped forgetting | Mesclada funcionalidade de esquecimento segmentado. | 2025-10-24 |
| Forget learning per scope | — | Permite limpar dados de aprendizagem por escopo com suporte de UI e testes. | 2025-10-24 |
| Merge PR #11 | File picker | Mesclada melhoria de seleção de ficheiros com ajustes no frontend/backend. | 2025-10-24 |
| Native file picker | — | Inseridos pickers nativos para seleção de ficheiros e removido leitor SoT. | 2025-10-24 |
| Merge PR #10 | Launcher | Mesclado script de bootstrap do ambiente e execução da GUI. | 2025-10-24 |
| Launcher bootstrap | — | Adicionado script para preparar ambiente e lançar a GUI automaticamente. | 2025-10-24 |
| Merge PR #9 | Export logging | Mescladas melhorias de exportação com telemetria. | 2025-10-24 |
| Export | Logging coverage | Cobertura do export Excel ampliada com logging adicional. | 2025-10-24 |
| Merge PR #8 | Review UI | Mesclado reforço de validações e UI de revisão de clusters. | 2025-10-24 |
| Review UI & validation | — | Validações reforçadas e UI de revisão de clusters aprimorada. | 2025-10-24 |

---

## 🚀 Quick Start

```bash
git clone git@github.com:storesace-cv/sa-convert-data.git
cd sa-convert-data
./start.sh
```

Runs the app in **learning mode** with GUI and embedded SQLite memory.

---

## 🧩 Folder Structure

```
app/          → Main application modules
tools/        → Database and Codex runners
rules/        → Classification and learning rules
docs/         → Documentation (Codex, roadmap, SoT)
main.py       → Application launcher
start.sh      → Environment + entrypoint
```

---

## 🔗 Related Documentation

- [Roadmap](docs/roadmap.md)
- [App Status (SoT)](docs/en/codex/architecture/app-status2gpt.md)

---

## 🧑‍💻 Credits

**Author:** BWB  
**License:** Proprietary – All rights reserved.

---

> codex:ensure_file(readme)  
> codex:never_edit_header  
> codex:sync_status_from("docs/en/codex/architecture/app-status2gpt.md")  
