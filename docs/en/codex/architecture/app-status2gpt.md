# App Status — SoT (sa-convert-data)

Generated human-readable mirror of the canonical state (`progress.json`) and runner inventory.

- Update via `scripts/codex/detect_state.py --write` and `scripts/rebuild_docs.sh`.
- Runners are idempotent and live in `docs/en/codex/runners/`.

## Signals
- Backend present (app/, main.py)
- Tests present (tests/)
- Docs present (docs/)
- Data inputs (databases/), domain rules (rules/), tools (tools/)
- Launchers (launcher, start.sh), venv (.venv)
