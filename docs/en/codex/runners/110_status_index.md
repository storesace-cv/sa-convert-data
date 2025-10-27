title: "110 — App Status Index (SoT sync)"
audience: "Codex executor"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md
rules:
  - "Idempotent"
plan:
  - "Ler SoT e atualizar docs de estado"
apply:
  - "Não destruir conteúdos manuais"
verify:
  - "scripts/verify_phase1_bootstrap.sh"
