#!/usr/bin/env bash
set -euo pipefail
echo "Checking CI workflow presence..."
test -f .github/workflows/ci-smoke.yml && echo "✓ ci-smoke.yml found" || (echo "✗ ci-smoke.yml missing" && exit 1)
python3 scripts/codex/mark_ci_smoke.py
scripts/verify_phase_status.sh || true
jq '.phases' docs/en/codex/progress.json || cat docs/en/codex/progress.json
