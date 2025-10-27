title: "410 — Tests & CI (Phase 4)"
audience: "Codex executor"
rules:
  - "Idempotent"
  - "No GUI/headless requirements"
plan:
  - "Create pytest config and tests that validate CLI entrypoints (--help)"
  - "Add dev requirements"
  - "Update CI to run pytest on pushes/PRs"
apply:
  - "tests/test_cli_help.py"
  - "pytest.ini"
  - "requirements-dev.txt"
  - "scripts/verify_phase4_ci.sh"
verify:
  - "Local: bash scripts/verify_phase4_ci.sh"
  - "CI: workflow must run pytest and pass"
