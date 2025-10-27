#!/usr/bin/env bash
# Aplica/commita/impulsiona alterações Smart‑Mode no teu branch pessoal
set -euo pipefail

BRANCH="${1:-my-sa-convert-data}"

git checkout "$BRANCH"
git fetch origin main
git reset --hard origin/main

# adiciona ficheiros gerados/alterados
git add README.md docs/ scripts/ .github/ || true

git commit -m "smartmode: bootstrap/runners/scripts/ci" || echo "ℹ️ Nada para commitar"
git push -u origin "$BRANCH" --force-with-lease
