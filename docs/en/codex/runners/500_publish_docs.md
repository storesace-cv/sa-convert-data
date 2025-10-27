title: "500 — Publish & Docs (macOS runtime only)"
audience: "Codex executor"
rules:
  - "Idempotent"
  - "No app bundling (.app)"
plan:
  - "Generate phase summary (docs/en/codex/phase-summary.md)"
  - "Ensure README addendum present (Platform & Packaging)"
  - "Zip docs/ and exports/ (if any) to exports/sa-convert-data_docs_v{date}.zip"
apply:
  - "Create 'exports/' if missing"
  - "Write/update phase-summary with current progress"
  - "Append README addendum if missing"
verify:
  - "Check existence of docs/en/codex/phase-summary.md"
  - "List created archive in exports/"
