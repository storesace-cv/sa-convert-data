---
title: "030 — SoT rules and conventions"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Always append a changelog block to SoT after any changes."
  - "Keep operations idempotent."
  - "Paths are repo-root relative."
---

# Purpose
Define how runners update the Source of Truth (SoT).

## How to update SoT
1. Append a `## Change @ {timestamp}` section in `app-status2gpt.md` with:
   - runner title;
   - files/folders created/touched;
   - brief summary of actions.
2. Update `app-status-index.json`:
   - `"last_update"` timestamp;
   - any new paths under `"artifacts"` or other keys as needed.

## Example (pseudo)
```
## Change @ 2025-10-24T00:00:00Z
- Runner: 020 — Start environment runner
- Changed: start.sh (exec), requirements.txt (read), .venv/*
- Summary: Created venv and installed dependencies.
```

## Guardrails
- Never modify the 2-line header of the export model file.
- All decisions must be logged (future: decision_log in SQLite).
