# Phase 4 — Codex Runner (420) hand-off

Use this runner to let Codex finish the implementation in one go.

## Files added
- `docs/en/codex/runners/420_export_validate_impl.md`

## How to apply
1. Unzip this pack into the repo root.
2. Commit to your branch `my-sa-convert-data` and push.
3. Open Codex and run the **start prompt** below.

## Start prompt for Codex (copy & paste)
```
RUNNER: docs/en/codex/runners/420_export_validate_impl.md

CONTEXT:
- Branch: my-sa-convert-data
- Do NOT auto-run GUI.
- Execute plan/apply/verify exactly as specified.
- If pytest fails, iterate fixes until all tests pass.
- Keep changes idempotent and minimal.

GO:
- Apply the runner end-to-end.
- When done, print a compact summary of what changed and the final pytest result.
```
