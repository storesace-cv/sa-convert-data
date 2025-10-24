#!/usr/bin/env bash
set -euo pipefail
FILE="docs/en/codex/progress.json"
if [[ ! -f "$FILE" ]]; then
  echo "progress.json not found. Run scripts/rebuild_docs.sh first."
  exit 1
fi
echo "PHASE | % | TITLE"
echo "-------------------------"
jq -r '.phases | to_entries[] | (.key + " | " + ( .value.percent|tostring ) + " | " + .value.title )' "$FILE" || cat "$FILE"
