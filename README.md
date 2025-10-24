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

### Current SoT State (as of 2025-10-24T18:48:34Z)

| Runner | Description | Summary | Date |
|---------|--------------|----------|------|
| 001 | Branch setup (HTTPS) | Configured origin and personal branch. | 2025-10-24 |
| 020 | Start environment | Created `.venv`, installed dependencies. | 2025-10-24 |
| 100 | Scaffold application | Generated app skeleton, DB, learning mode. | 2025-10-24 |
| 110 | DB initialized | Created `data.db`, validated schema. | 2025-10-24 |

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
