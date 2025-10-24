---
title: "020 — Start environment runner (venv + requirements)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotent: safe to run multiple times."
  - "Do not pin user-specific paths; repo-root relative only."
---

# Goal
Ensure Python virtual environment and install dependencies from `requirements.txt` using `./start.sh`.

# Preconditions
- `start.sh` is present and executable.
- `requirements.txt` exists (baseline dependencies are acceptable).

# Actions
```bash
chmod +x ./start.sh
./start.sh
```

# Postconditions
- Virtualenv `.venv/` exists and is activated during the run.
- Dependencies installed/up-to-date.
- SoT changelog updated.
