#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"/../..

if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate || true
fi

if [[ -f app.py ]]; then
  python app.py
elif python -c "import sa_convert_data" >/dev/null 2>&1; then
  python -m sa_convert_data
else
  echo "❌ Nenhum entrypoint encontrado (precisa de app.py ou módulo sa_convert_data)"
  exit 1
fi
