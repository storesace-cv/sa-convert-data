title: "310 — DB migrate/init (create raw_row_json etc.)"
audience: "Codex executor"
rules:
  - "Idempotent"
plan:
  - "Criar migrações mínimas para staging"
apply:
  - "Criar scripts seguros e reexecutáveis"
verify:
  - "scripts/verify_phase2_cli.sh"
