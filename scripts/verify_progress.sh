#!/usr/bin/env bash
set -euo pipefail
jq -e '.phases | keys | length >= 5' docs/en/codex/progress.json >/dev/null 2>&1 && \
echo "✅ progress.json OK" || { echo "❌ progress.json inválido"; exit 1; }
