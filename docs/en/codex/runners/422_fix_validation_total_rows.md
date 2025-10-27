title: "422 — Validation.total_rows: robust source (join + fallback)"
audience: "Codex executor"
rules:
  - "Branch: main"
  - "Idempotent"
  - "Sem GUI"
goal: |
  Garantir que report JSON contém {"validation":{"total_rows":N}} correto:
  1) Tentar contar por junção approval_decision → imported_raw por batch_id.
  2) Se 0, fazer fallback para COUNT(imported_raw WHERE batch_id=?).
apply:
  - "Editar tools/export_validate.py (ou módulo relevante) na função que calcula validation.total_rows:"
  - "  • Query A: SELECT COUNT(*) FROM approval_decision ad JOIN imported_raw ir ON ir.id=ad.artigo_base_raw_id WHERE ir.batch_id=?"
  - "  • Se resultado==0, Query B: SELECT COUNT(*) FROM imported_raw WHERE batch_id=?"
  - "  • Certificar que o JSON final inclui validation.total_rows e que o XLSX tem >=3 linhas."
verify:
  - "Local: bash scripts/verify_phase4_ci.sh"
  - "Local: bash scripts/verify_phase4_e2e.sh"
  - "CI: Phase 4 — Tests & QA a verde"
