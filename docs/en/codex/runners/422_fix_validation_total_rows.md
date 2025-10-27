title: "422 — Validation.total_rows: robust source (join + fallback)"
audience: "Codex executor"
rules:
  - "Branch: main"
  - "Idempotent"
  - "Sem GUI"
  - "Zero ambiguidade; seguir exactamente este documento"
goal: |
  Garantir que o relatório JSON contém {"validation":{"total_rows":N}} correcto:
  1) Contar por junção approval_decision → imported_raw por batch_id.
  2) Se o resultado for 0, fazer fallback para COUNT(imported_raw WHERE batch_id=?).
  3) Reutilizar este total para XLSX (linha de resumo) e CSV quando aplicável.
  4) Registar um evento em decision_log com action='export_validation' e payload mínimo (batch_id, artifacts, validation).
plan: |
  - Implementar helper único (ex.: _fetch_total_rows(batch_id)) no módulo de exportação/CLI.
  - Helper executa Query A (join) e, se 0, Query B (fallback).
  - Reutilizar helper ao gerar XLSX e CSV (TOTAL_ROWS consistente).
  - Garantir que a CLI continua executável (python tools/export_validate.py --batch-id ...).
  - Garantir que o audit log é criado através do módulo de auditoria existente (ou inserindo em decision_log).
apply:
  - "Editar tools/export_validate.py (ou módulo referido) e criar _fetch_total_rows(batch_id)."
  - "Usar o helper no momento de compor artifacts e relatórios."
  - "JSON report deve conter {'validation': {'total_rows': N}} e caminho para artifacts."
  - "XLSX deve ter pelo menos 3 linhas (header + data + summary TOTAL_ROWS)."
  - "Inserir em decision_log(action='export_validation', payload_json, created_at)."
verify:
  - "Local: bash scripts/verify_phase4_ci.sh (pytest)"
  - "Local: bash scripts/verify_phase4_e2e.sh (DB→export→artefactos→audit-log)"
  - "CI: job 'Phase 4 — E2E export smoke' via workflow_dispatch a verde"
outputs:
  - "Código alterado; testes e2e/ci a verde"
  - "Resumo final com testes passados"
