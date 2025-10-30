#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------
# launcher.sh (root)
# Atualiza branch a partir do main, garante venv, resolve requirements e arranca a app.
# Idempotente. macOS/Linux. Sem alterações ao código-fonte.
# Logs em logs/launcher-YYYYmmddTHHMMSSZ.log
# -----------------------------

cd "$(dirname "$0")"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf "[%s] %s\n" "$(ts)" "$*" >&2; }

mkdir -p logs
LOG_FILE="logs/launcher_$(date -u +%Y%m%dT%H%M%SZ).log"
# duplica stdout/stderr para o log
exec > >(tee -a "$LOG_FILE") 2>&1

log "Launcher iniciado."

# --- 1) Atualizar o branch atual a partir do origin/main ---
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CURR_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  log "Git OK. Branch atual: ${CURR_BRANCH}"
  log "git fetch origin…"
  git fetch origin

  # Primeiro tenta fast-forward; se falhar, tenta rebase
  if git merge --ff-only origin/main >/dev/null 2>&1; then
    log "Fast-forward de origin/main aplicado com sucesso."
  else
    log "Fast-forward indisponível. A tentar rebase para alinhar com origin/main…"
    if git rebase origin/main; then
      log "Rebase concluído."
    else
      log "Rebase falhou. A abortar rebase e prosseguir sem atualização forçada."
      git rebase --abort || true
    fi
  fi
else
  log "Aviso: diretório não é um repositório Git. Prosseguir sem sync."
fi

# --- 2) Garantir .venv e ativar ---
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [[ -z "${VIRTUAL_ENV:-}" ]]; then
  if [[ ! -d ".venv" ]]; then
    log "A criar venv em .venv…"
    "$PYTHON_BIN" -m venv .venv
  fi
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
  log "Venv ativa: ${VIRTUAL_ENV}"
else
  log "Já em venv: ${VIRTUAL_ENV}"
fi

# Atualizar pip/setuptools/wheel
python -m pip install --upgrade pip setuptools wheel >/dev/null

# --- 3) Requirements: instalar se existir; gerar se faltar/estiver vazio ---
REQ_TXT="requirements.txt"
NEEDS_GEN=0
if [[ ! -f "$REQ_TXT" ]]; then
  log "requirements.txt não existe. Vai ser gerado."
  NEEDS_GEN=1
elif [[ ! -s "$REQ_TXT" ]]; then
  log "requirements.txt existe mas está vazio. Vai ser gerado."
  NEEDS_GEN=1
fi

if [[ "$NEEDS_GEN" -eq 0 ]]; then
  log "A instalar dependências de requirements.txt…"
  pip install -r "$REQ_TXT"
else
  log "A gerar requirements a partir do código (pipreqs + pip-tools)…"
  pip install pipreqs pip-tools >/dev/null
  # gerar um .in temporário com base nos imports reais (ignorando pastas irrelevantes)
  REQ_IN="requirements.auto.in"
  pipreqs . --force --encoding=utf-8 --ignore .venv,dist,build,docs,tests --savepath "$REQ_IN"
  # compilar para pinned requirements.txt
  pip-compile "$REQ_IN" -o "$REQ_TXT" --generate-hashes --upgrade
  log "A instalar dependências de $REQ_TXT…"
  pip install -r "$REQ_TXT"
fi

# --- 4) Arrancar a aplicação (heurísticas CLI/GUI/API) ---
log "A procurar entrypoint para arrancar a app…"
python - <<'PY'
import importlib, os, sys, shutil

candidates = [
    # módulo CLI
    ("module", "app.main", ["-m","app.main"]),
    # GUIs comuns
    ("file",   "src/app_gui.py",        ["src/app_gui.py"]),
    ("file",   "src/ui/main_window.py", ["src/ui/main_window.py"]),
    ("file",   "src/app_main.py",       ["src/app_main.py"]),
    ("file",   "app.py",                ["app.py"]),
    # API (FastAPI/Starlette)
    ("api",    "src/api/main.py",       None),
]

def exec_cmd(argv):
    os.execvp(argv[0], argv)

for kind, target, args in candidates:
    if kind == "module":
        try:
            importlib.import_module(target)
            exec_cmd([sys.executable] + args)
        except Exception:
            pass
    elif kind == "file":
        if os.path.isfile(target):
            exec_cmd([sys.executable] + args)
    elif kind == "api":
        if os.path.isfile(target):
            uv = shutil.which("uvicorn")
            if uv:
                exec_cmd([uv, "src.api.main:app", "--reload"])
            else:
                exec_cmd([sys.executable, target])

print("Launcher: não encontrei um entrypoint conhecido (CLI/GUI/API).", file=sys.stderr)
print("Sugestão: ajusta a lista de candidatos no launcher ou indica o ficheiro principal.", file=sys.stderr)
sys.exit(1)
PY
