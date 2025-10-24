# App Status — Source of Truth (SoT)
This document is **the single source of truth** for Codex and humans.
Every Codex runner **MUST** append a changelog entry.

## Index
- SoT index: `docs/en/codex/architecture/app-status-index.json`
- This file: `docs/en/codex/architecture/app-status2gpt.md`

## Project
- Name: sa-convert-data
- GUI: pywebview (direct, no HTTP server)
- OS: macOS (Apple Silicon compatible)

## Changelog
- 2025-10-24T00:17:25Z — Seed v2: SSH remote fixed, `.codex.env` added, start.sh & runners ready.

## Change @ 2025-10-24T00:36:04Z
- Runner: 001 — Branch setup (HTTPS)
- Changed: git remote (origin), branches (main/my-sa-convert-data)
- Summary: Configurado origin via HTTPS e criado/alinhado o branch pessoal.

## Change @ 2025-10-24T00:36:04Z
- Runner: 020 — Start environment runner
- Changed: start.sh (exec), .venv/*, requirements.txt (read)
- Summary: Criado/validado venv e instaladas dependências.
