#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
VENV_DIR="${ROOT_DIR}/.venv_reqcheck"

python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"

pip install --upgrade pip >/dev/null
pip install -r "${ROOT_DIR}/requirements.txt"

python - <<'PY'
import importlib
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SEARCH_DIRS = ['src', 'app', 'scripts']
module_names = []
for search in SEARCH_DIRS:
    target = os.path.join(ROOT, search)
    if not os.path.isdir(target):
        continue
    for dirpath, dirnames, filenames in os.walk(target):
        parts = set(dirpath.split(os.sep))
        if parts.intersection({'.venv', 'node_modules', '__pycache__'}):
            continue
        for filename in filenames:
            if filename.endswith('.py'):
                rel = os.path.relpath(os.path.join(dirpath, filename), ROOT)
                mod = rel[:-3].replace(os.sep, '.')
                if mod.endswith('__init__'):
                    mod = mod.rsplit('.', 1)[0]
                module_names.append(mod)

if not module_names:
    print('No Python modules detected for smoke import. Skipping import step.')
    sys.exit(0)

sys.path.insert(0, ROOT)
for name in module_names:
    if not name:
        continue
    importlib.import_module(name)
    print(f"Imported {name}")
PY

deactivate
rm -rf "${VENV_DIR}"
