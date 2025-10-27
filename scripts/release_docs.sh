#!/usr/bin/env bash
# scripts/release_docs.sh — Package docs (no binary/app)
set -euo pipefail

DATE="$(date -u +%Y%m%d_%H%M%S)"
OUTDIR="exports"
ARCHIVE="${OUTDIR}/sa-convert-data_docs_${DATE}.zip"

mkdir -p "${OUTDIR}"

# Ensure phase summary exists (lightweight)
SUMMARY="docs/en/codex/phase-summary.md"
if [[ ! -f "${SUMMARY}" ]]; then
  mkdir -p "$(dirname "${SUMMARY}")"
  {
    echo "# Phase Summary"
    echo
    echo "- Generated: $(date -u +"%Y-%m-%d %H:%M:%SZ")"
    echo "- Notes: macOS runtime only; no app bundling."
  } > "${SUMMARY}"
fi

# Collect docs and selected folders only
zip -r "${ARCHIVE}" docs || { echo "❌ Failed to zip docs"; exit 1; }

echo "✅ Created ${ARCHIVE}"
