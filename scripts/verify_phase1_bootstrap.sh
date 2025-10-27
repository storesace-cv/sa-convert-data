#!/usr/bin/env bash
set -euo pipefail
fail=0

echo "🧪 Verificar SoT e estrutura Smart‑Mode"

test -f docs/en/codex/architecture/app-status-index.json || { echo "❌ Falta SoT index"; fail=1; }
test -f docs/en/codex/architecture/app-status2gpt.md     || { echo "❌ Falta SoT text"; fail=1; }
test -f docs/en/codex/progress.json                      || { echo "❌ Falta progress.json"; fail=1; }
test -d docs/en/codex/runners                            || { echo "❌ Falta runners/"; fail=1; }
test -d docs/en/codex/phases                             || { echo "❌ Falta phases/"; fail=1; }

if [[ $fail -eq 0 ]]; then
  echo "✅ Phase 1 OK"
else
  echo "❌ Phase 1 falhou"; exit 1
fi
