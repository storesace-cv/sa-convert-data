#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-.venv}"
REQ_FILE="${REQ_FILE:-requirements.txt}"
APP_MODULE="${APP_MODULE:-main}"
LAUNCH_ARGS=("$@")

log() {
  printf '▶ %s\n' "$*"
}

warn() {
  printf '⚠️  %s\n' "$*" >&2
}

fatal() {
  printf '❌ %s\n' "$*" >&2
  exit 1
}

log "Checking Python interpreter ($PYTHON_BIN)..."
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  fatal "Python not found (looked for '$PYTHON_BIN'). Set PYTHON_BIN or install Python 3.11+."
fi

log "Ensuring virtual environment at $VENV_DIR"
if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR" || fatal "Failed to create virtual environment in $VENV_DIR"
fi

# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

python - <<'PY'
import sys
if sys.version_info < (3, 11):
    raise SystemExit("Python >= 3.11 is required inside the virtualenv")
PY

log "Upgrading pip, setuptools, wheel"
python -m pip install --upgrade pip setuptools wheel

if [ -f "$REQ_FILE" ]; then
  log "Installing dependencies from $REQ_FILE"
  python -m pip install -r "$REQ_FILE"
else
  warn "Requirements file '$REQ_FILE' not found. Skipping dependency installation."
fi

if ! python -c "import importlib.util; import sys; sys.exit(0 if importlib.util.find_spec('${APP_MODULE}') else 1)"; then
  fatal "Module '${APP_MODULE}' not found. Check APP_MODULE or ensure main entry point exists."
fi

log "Launching ${APP_MODULE}..."
exec python -m "$APP_MODULE" "${LAUNCH_ARGS[@]}"
