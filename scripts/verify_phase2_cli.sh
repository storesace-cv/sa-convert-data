#!/usr/bin/env bash
set -euo pipefail
fail=0

echo "🧪 Verificar CLIs e regras"

python -c "import sys; print('python ok', sys.version)" >/dev/null 2>&1 || { echo '❌ Python não operacional'; fail=1; }

for f in tools/learn.py tools/classify.py tools/export_validate.py; do
  if [[ -f "$f" ]]; then
    python "$f" --help >/dev/null 2>&1 || { echo "❌ $f --help falhou"; fail=1; }
  else
    echo "ℹ️ Aviso: falta $f (runner Phase 2 ainda não aplicou)"
  fi
done

[[ $fail -eq 0 ]] && echo "✅ Phase 2 OK" || { echo "❌ Phase 2 falhou"; exit 1; }
