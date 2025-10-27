title: "315 — Artigo - Classificação (only COMPRA / COMPRA/VENDA, default COMPRA/VENDA)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotent"
goal: |
  On export, write a single 'X' only in COMPRA or COMPRA/VENDA.
  Default is COMPRA/VENDA. If a canonical item has canonical_attrs.class_tag = 'COMPRA', then mark COMPRA.
verify:
  - "scripts/verify_phase2_cli.sh"
