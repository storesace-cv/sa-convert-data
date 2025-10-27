# Phase 2 — CLI & Rules

## Goal
Disponibilizar CLIs para aprendizagem/classificação/export, com regras de classificação (COMPRA / COMPRA/VENDA).

## Deliverables
- `tools/learn.py`, `tools/classify.py`, `tools/export_validate.py`
- `docs/en/codex/runners/300_add_entrypoint_gui.md` (prepara integração futura com GUI)
- `docs/en/codex/runners/310_db_migrate_init.md`
- `docs/en/codex/runners/315_classificacao_rules.md`
- `scripts/verify_phase2_cli.sh`

## Checklist
- [ ] CLIs respondem a `--help`
- [ ] Regras idempotentes e testadas em amostras

## Verify
```bash
scripts/verify_phase2_cli.sh
```
