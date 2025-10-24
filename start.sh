#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-.venv}"
REQ_FILE="${REQ_FILE:-requirements.txt}"

echo "▶ Checking Python..."
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "❌ Python not found (looked for '$PYTHON_BIN'). Install Python 3.11+ and retry."
  exit 1
fi

echo "▶ Ensuring virtualenv at $VENV_DIR"
if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

python -c "import sys; assert sys.version_info >= (3,11), 'Python >=3.11 required'" || {
  echo "❌ Python version in venv must be >= 3.11"
  exit 1
}

python -m pip install --upgrade pip wheel setuptools

if [ -f "$REQ_FILE" ]; then
  echo "▶ Installing requirements from $REQ_FILE..."
  python -m pip install -r "$REQ_FILE"
else
  echo "⚠️  $REQ_FILE not found. Skipping pip install."
fi

echo "✅ Environment ready. To activate later: source $VENV_DIR/bin/activate"
