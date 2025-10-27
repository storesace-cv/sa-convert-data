#!/usr/bin/env bash
set -euo pipefail

echo "🧪 Verificar entrypoints (launcher/módulo/app.py)"
ok=0

if [[ -x scripts/launchers/sa_convert_data.sh ]]; then
  echo "✅ launcher encontrado: scripts/launchers/sa_convert_data.sh"; ok=1
fi
python -c "import sa_convert_data" >/dev/null 2>&1 && { echo "✅ módulo python sa_convert_data detectado"; ok=1; } || true
[[ -f app.py ]] && { echo "✅ app.py detectado"; ok=1; } || true

if [[ $ok -eq 0 ]]; then
  echo "❌ Nenhum entrypoint encontrado"
  exit 1
fi
