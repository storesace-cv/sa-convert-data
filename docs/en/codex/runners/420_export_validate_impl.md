title: "420 — Implement export validation (tools/export_validate.py) to satisfy tests"
audience: "Codex executor"
rules:
  - "Idempotent"
  - "Must use env SA_CONVERT_EXPORT_DIR for output base dir"
  - "Return value MUST include keys: out (xlsx path), xlsx, csv, report"
  - "Write report as JSON (UTF-8) with keys: batch_id, model_path, status, validation"
  - "No GUI execution in CI"
sot:
  index: docs/en/codex/architecture/app-status-index.json
  text: docs/en/codex/architecture/app-status2gpt.md

goal: |
  Make tests under tests/ pass, specifically test_run_export_validation_cli_generates_artifacts.
  The function tools.export_validate.run_export_validation must produce artifacts and a JSON report
  that includes validation metrics derived from the DB.

acceptance_criteria:
  - "pytest passes completely (CI and local)"
  - "Report at SA_CONVERT_EXPORT_DIR/<batch>/report_<batch>.json exists and is valid JSON"
  - "Report JSON contains 'validation.total_rows' with the number of rows to export (>= 1)"
  - "Return dict includes: out (xlsx path), xlsx, csv, report"

plan:
  - "Read env vars: SA_CONVERT_EXPORT_DIR (default './exports')"
  - "Ensure output dir exists: <export_dir>/<batch_id>"
  - "Connect DB using app.backend.db.connect()"
  - "Compute basic metrics used by tests: total_rows from an appropriate table/view; prefer 'imported_raw' or 'approval_decision' join"
  - "Write XLSX using openpyxl with at least one sheet 'Export'"
  - "Write CSV with a header line and at least one data row"
  - "Write JSON report with structure:"

report_schema: |
  {
    "batch_id": "<batch_id>",
    "model_path": "<string>",
    "status": "OK",
    "validation": {
      "total_rows": <int>
    },
    "artifacts": {
      "xlsx": "<absolute-or-relative-path>",
      "csv": "<absolute-or-relative-path>"
    }
  }

apply:
  - "Open file tools/export_validate.py and implement run_export_validation(batch_id, model_path=None, export_dir=None)"
  - "Query DB to compute 'validation.total_rows' using one of:"
  - "  SELECT COUNT(*) FROM approval_decision;"
  - "  or SELECT COUNT(*) FROM imported_raw WHERE batch_id = ?; (choose best per current schema)"
  - "Populate JSON report following report_schema above"
  - "Return dict with keys {'out','xlsx','csv','report'}"
  - "Keep CLI entrypoint working: python tools/export_validate.py --batch-id X --model-path <path> --verbose"

verify:
  - "Local: bash scripts/verify_phase4_ci.sh"
  - "CI: workflow 'Phase 4 — Tests & QA' must pass"
