# sa-convert-data — Smart-Mode

This repository is now **Smart-Mode enabled**. Smart-Mode adds a canonical Source of Truth (SoT), reproducible runners, and a measurable progress ledger—without replacing your current code/docs.

**Detected signals (from repo layout you shared):**
- Backend: `app/`, `main.py`
- Tests: `tests/`
- Docs: `docs/`
- Data inputs: `databases/`
- Rules: `rules/`
- Tools: `tools/`
- Launchers: `launcher`, `start.sh`
- Virtual env: `.venv`

> Non-destructive: Only new files under `docs/en/codex/*` and `scripts/*` are added.

## Quick start
```bash
git checkout -B my-sa-convert-data

unzip smart-mode-sa-convert-data.zip
git add docs scripts README.md ROADMAP.md
git commit -m "chore(smart-mode): SoT + runners + progress for sa-convert-data"

# Generate SoT from CURRENT repo and merge progress
scripts/codex/detect_state.py --write --safe

# Rebuild docs & verify
scripts/rebuild_docs.sh
scripts/verify_phase_status.sh
```

## Canonical files
- SoT Index: `docs/en/codex/architecture/app-status-index.json`
- SoT Text:  `docs/en/codex/architecture/app-status2gpt.md`
- Progress:  `docs/en/codex/progress.json`

## Changelog (Smart-Mode)
- 2025-10-24 — Bootstrap for sa-convert-data (SoT, runners, progress, scripts).
