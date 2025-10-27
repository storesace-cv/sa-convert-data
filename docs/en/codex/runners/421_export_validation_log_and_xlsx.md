title: "421 — Export validation: decision_log + XLSX rows"
audience: "Codex executor"
rules:
  - "Idempotent"
  - "Trabalhar no branch main"
  - "Não arrancar GUI"
  - "Iterar até pytest a verde"
goal: |
  Fechar os testes de export validation:
  - Inserir registo em decision_log(action='export_validation', payload_json, created_at).
  - Garantir JSON report com {"validation":{"total_rows":N}}.
  - Garantir XLSX com pelo menos 3 linhas (header + data + summary).
apply:
  - "Editar tools/export_validate.py:"
  - "  • Após gerar JSON report, inserir em decision_log (action='export_validation')."
  - "  • payload_json: {batch_id, model_path, status:'OK', validation, artifacts} (JSON)."
  - "  • created_at: usar app.backend.db.now_utc() se existir."
  - "  • Garantir que o XLSX escreve uma 3ª linha (ex.: ['TOTAL_ROWS', N])."
  - "  • Retorno deve conter {'out','xlsx','csv','report'}."
verify:
  - "Local: bash scripts/verify_phase4_ci.sh"
  - "CI: workflow 'Phase 4 — Tests & QA' a verde"
