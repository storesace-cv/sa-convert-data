# App Status — SoT

This file mirrors progress.json. Managed by scripts.

## Change @ 2025-10-24T21:44:31Z
- Runner: Smart-Mode — Roadmap clarity enhancements
- Changed: docs/roadmap.md, docs/en/codex/architecture/app-status-index.json, docs/en/codex/architecture/app-status2gpt.md
- Summary: Added measurable milestones, definitions of done, and a recurring checklist for roadmap upkeep.

### Roadmap Update Checklist
- [ ] Update phase `progress` and `status` immediately after each runner execution.
- [ ] Append a matching SoT changelog entry referencing touched artifacts.
- [ ] Sync `docs/en/codex/progress.json` with roadmap deltas before commit.

## Change @ 2025-10-24T21:55:27Z
- Runner: Phase 1 — Learning Engine completion
- Changed: .gitignore, app/backend/db.py, app/backend/learning_importer.py, app/backend/learning_rules.py, tools/learn.py, rules/learning_rules.json, databases/app/data.db, tests/test_learning_importer.py, docs/roadmap.md, docs/en/codex/progress.json
- Summary: Finalized learning engine with deduplication persistence, CLI tooling, baseline rules export, and seeded application database.

## Change @ 2025-10-24T22:15:00Z
- Runner: Phase 1 — Learning Engine completion
- Changed: .gitignore, app/backend/db.py, databases/app/README.md, databases/app/schema.sql, docs/roadmap.md, docs/en/codex/110_init_db_runner.md
- Summary: Replaced the tracked SQLite artifact with a schema script and refreshed initialization docs for client-side database creation.

## Change @ 2025-10-24T23:00:00Z
- Runner: 315 — Artigo - Classificacao (only COMPRA / COMPRA/VENDA, default COMPRA/VENDA)
- Changed: app/backend/classification_engine.py, app/backend/classification_rules.py, app/backend/exporter_excel.py, rules/classification_rules.json, tools/classify.py, tests/test_classification_engine.py, tests/test_exporter_excel.py, docs/roadmap.md, docs/en/codex/progress.json, docs/en/codex/architecture/app-status-index.json
- Summary: Added canonical classification inference with confidence metrics, CLI generation tool, exporter integration, and updated progress documentation for the classification rules milestone.

## Change @ 2025-10-25T00:30:00Z
- Runner: Phase 3 — Export & Validation
- Changed: app/backend/export_validation.py, app/backend/exporter_excel.py, tools/export_validate.py, tests/test_export_validation.py, tests/test_exporter_excel.py, docs/en/codex/progress.json, docs/en/codex/architecture/app-status-index.json
- Summary: Implemented export validation with canonical structure enforcement and half-up rounding, wired results into the Excel exporter, added CLI orchestration with decision logging, expanded automated coverage, and marked Phase 3 deliverables complete in SoT.
