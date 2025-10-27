title: "100 — SoT Bootstrap"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotent"
  - "Documentação como contrato"
plan:
  - "Validar existência de SoT e progress.json"
  - "Gerar sumário de componentes (CLI/GUI/Rules)"
apply:
  - "Se faltarem ficheiros base, criar placeholders (sem apagar existentes)"
verify:
  - "scripts/verify_phase1_bootstrap.sh"
