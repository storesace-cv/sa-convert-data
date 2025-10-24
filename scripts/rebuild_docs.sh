#!/usr/bin/env bash
set -euo pipefail
scripts/codex/detect_state.py --write --safe >/dev/null || true
echo "✓ SoT & progress refreshed"
jq '.phases' docs/en/codex/progress.json || cat docs/en/codex/progress.json
