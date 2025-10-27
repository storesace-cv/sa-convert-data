title: "420 — Implement export validation (tools/export_validate.py) to satisfy tests"
audience: "Codex executor"
rules:
  - "Idempotent"
  - "Use SA_CONVERT_EXPORT_DIR como base para artefactos"
  - "Return inclui: out (xlsx), xlsx, csv, report"
  - "Relatório em JSON UTF-8 com: batch_id, model_path, status, validation"
  - "Sem executar GUI no CI"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md

goal: |
  Fazer os testes passarem (em especial test_run_export_validation_cli_generates_artifacts).
  A função tools.export_validate.run_export_validation deve produzir artefactos (XLSX/CSV)
  e um relatório JSON com métricas calculadas a partir da BD.

acceptance_criteria:
  - "pytest passa local e no CI"
  - "report_<batch>.json válido em SA_CONVERT_EXPORT_DIR/<batch>/"
  - "JSON contém validation.total_rows (>= 1)"
  - "Return dict com chaves {'out','xlsx','csv','report'}"

plan:
  - "Ler env: SA_CONVERT_EXPORT_DIR (default ./exports)"
  - "Garantir diretório: <export_dir>/<batch_id>"
  - "Ligar à BD via app.backend.db.connect()"
  - "Calcular validation.total_rows (ex.: SELECT COUNT(*) FROM imported_raw WHERE batch_id = ?)"
  - "Gerar XLSX (openpyxl) com folha 'Export'"
  - "Gerar CSV com cabeçalho"
  - "Gerar JSON report com esquema abaixo"

report_schema: |
  {
    "batch_id": "<batch_id>",
    "model_path": "<string>",
    "status": "OK",
    "validation": {
      "total_rows": <int>
    },
    "artifacts": {
      "xlsx": "<path>",
      "csv": "<path>"
    }
  }

apply:
  - "Implementar/emendar tools/export_validate.py: run_export_validation(batch_id, model_path=None, export_dir=None)"
  - "Usar SA_CONVERT_EXPORT_DIR ou parâmetro export_dir"
  - "Devolver {'out','xlsx','csv','report'} conforme acceptance_criteria"
  - "CLI mantém: python tools/export_validate.py --batch-id X --model-path <path> --verbose"

verify:
  - "Local: bash scripts/verify_phase4_ci.sh"
  - "CI: workflow 'Phase 4 — Tests & QA' passa a verde"
