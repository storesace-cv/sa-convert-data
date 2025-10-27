title: "400 — CI Smoke & QA Gates"
audience: "Codex executor"
rules:
  - "Idempotent"
plan:
  - "Executar lint/verify/test em GitHub Actions"
apply:
  - "Configurar .github/workflows/smartmode_ci.yml"
verify:
  - "scripts/verify_progress.sh"
