#!/usr/bin/env bash
set -euo pipefail

echo "🧪 Phase 4 — Running tests with pytest"
# Ensure virtualenv is active if present
if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate || true
fi

# Dev deps
if [[ -f requirements-dev.txt ]]; then
  python -m pip install -U pip >/dev/null 2>&1 || true
  pip install -r requirements-dev.txt
else
  pip install -U pytest
fi

pytest
echo "✅ Phase 4 tests OK"
