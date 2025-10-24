# Codex Roadmap — sa-convert-data

This document defines the **technical roadmap** and **Codex automation structure** for the `sa-convert-data` application.  
All Codex runners must refer to this file for dependency and milestone tracking.

---

## 🗺️ Phase Summary

| Phase | Title | Goal | Completion | Status |
|-------|--------|------|-------------|---------|
| 0 | Setup & Branch | Environment and repository setup | 100% | ✅ Done |
| 1 | Learning Engine | Deduplication & Learning ingestion | 40% | ⚙️ In Progress |
| 2 | Classification Rules | Article type inference & logic | 0% | ⏳ Pending |
| 3 | Export & Validation | Structured exports, QA checks | 0% | ⏳ Pending |
| 4 | GUI & QA Automation | Interactive GUI + test harness | 0% | ⏳ Pending |
| 5 | Release & CI/CD | Final validation and GitHub Actions | 0% | ⏳ Pending |

---

## ⚙️ Phase 0 — Setup & Branch

```codex
phase: 000
runner: runner_001_branch_setup.py
depends_on: none
goal: Initialize repo (origin/branch HTTPS, SSH, SoT sync)
artifacts: .venv, .codex.env, start.sh
status: completed
idempotent: true
```

---

## 🧠 Phase 1 — Learning Engine

```codex
phase: 100-199
runner: runner_100_scaffold.py, runner_110_db_init.py, runner_120_learning_mode.py
depends_on: phase_000
goal: Create base application, initialize database, implement "learning" logic for ingestion and deduplication.
details:
  - Detect duplicate records across multiple store datasets.
  - Normalize capitalization and accents.
  - Maintain memory of prior classification decisions.
progress: 40
status: in-progress
expected_output:
  - databases/app/data.db
  - tools/learn.py
  - rules/learning_rules.json
idempotent: true
```

---

## 🧩 Phase 2 — Classification Rules

```codex
phase: 200-299
runner: runner_200_classification_rules.py
depends_on: phase_100
goal: Apply semantic rules to determine article class ("COMPRA" / "COMPRA-VENDA").
details:
  - Implement canonical_attrs.class_tag inference.
  - Generate field-level classification confidence metrics.
progress: 0
status: pending
expected_output:
  - rules/classification_rules.json
  - tools/classify.py
idempotent: true
```

---

## 📤 Phase 3 — Export & Validation

```codex
phase: 300-399
runner: runner_300_export_validation.py
depends_on: phase_200
goal: Generate clean export files (CSV, JSON, Excel) with validation checks.
details:
  - Validate structure consistency vs canonical schema.
  - Apply “half-up” rounding control.
  - Write clean export datasets for downstream systems.
progress: 0
status: pending
expected_output:
  - exports/cleaned_articles.xlsx
  - exports/validation_report.json
idempotent: true
```

---

## 🖥️ Phase 4 — GUI & QA Automation

```codex
phase: 400-499
runner: runner_400_gui_qa.py
depends_on: phase_300
goal: Extend pywebview GUI to visualize learning and classification accuracy.
details:
  - Implement visual progress indicators.
  - Add QA unit tests and dashboards.
  - Integrate ReportBro templates for PDF export.
progress: 0
status: pending
expected_output:
  - gui/learning_dashboard.html
  - tests/qa_results.json
idempotent: true
```

---

## 🚀 Phase 5 — Release & CI/CD

```codex
phase: 500-599
runner: runner_500_release_pipeline.py
depends_on: phase_400
goal: Integrate release pipeline and GitHub Actions CI/CD.
details:
  - Validate full chain (learning → export → GUI → QA).
  - Build release artifacts (macOS, Windows optional).
  - Push final build and changelog updates to SoT.
progress: 0
status: pending
expected_output:
  - artifacts/sa-convert-data_vX.Y.Z.zip
  - docs/en/codex/changelog_final.md
idempotent: true
```

---

## 🔄 Codex Update Rules

1. Always update this roadmap **after** running any new phase runner.
2. Keep `progress` and `status` fields accurate for Codex automation.
3. Synchronize SoT via `app-status2gpt.md` on each commit.
4. Never remove or reorder phases — mark obsolete ones as `deprecated`.

---

> codex:track_roadmap(phases=0-5)  
> codex:auto_update_progress(from="app-status2gpt.md")  
> codex:lock_structure  
