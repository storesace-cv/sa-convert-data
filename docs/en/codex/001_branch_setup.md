---
title: "001 — Branch setup (SSH remote)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "ALWAYS read SoT first; if missing, bootstrap minimal files."
  - "Idempotent: re-running must not error."
---

# Goal
Ensure remote uses **SSH**, and create/align the user branch `my-sa-convert-data` with `origin/main`.

# Preconditions
- SSH key configured in GitHub for the user.
- Current working directory is the repo root.

# Steps
```bash
# Force SSH remote
git remote set-url origin https://github.com/storesace-cv/sa-convert-data.git

# Ensure main is up to date
git fetch origin
git checkout main
git pull --ff-only origin main

# Create the personal branch if absent, else fast-forward to origin/main
if git show-ref --verify --quiet refs/heads/my-sa-convert-data; then
  git checkout my-sa-convert-data
  git merge --ff-only origin/main || git reset --hard origin/main
else
  git checkout -b my-sa-convert-data origin/main || git checkout -b my-sa-convert-data
fi

# Track remote branch (tolerate first push failure if it already exists)
git push -u origin my-sa-convert-data || true
```

# Postconditions
- Remote is SSH: `https://github.com/storesace-cv/sa-convert-data.git`.
- Branch `my-sa-convert-data` exists local/remoto e alinhado a `origin/main`.
- SoT changelog updated with branch action.
