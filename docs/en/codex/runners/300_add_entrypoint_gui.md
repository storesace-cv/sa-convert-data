title: "300 — Add GUI Entrypoint (pywebview minimal)"
audience: "Codex executor"
rules:
  - "Idempotent"
plan:
  - "Criar app.py a servir app/frontend/index.html via Bottle"
apply:
  - "Apenas criar se não existir entrypoint"
verify:
  - "scripts/verify_launcher.sh"
