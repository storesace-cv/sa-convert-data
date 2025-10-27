title: "200 — Verify Launcher & Entrypoints"
audience: "Codex executor"
rules:
  - "Idempotent"
plan:
  - "Detetar scripts/launchers, módulo python e app.py"
apply:
  - "Se não existir launcher, criar scripts/launchers/sa_convert_data.sh"
  - "Não sobrepor entrypoints existentes"
verify:
  - "scripts/verify_launcher.sh"
