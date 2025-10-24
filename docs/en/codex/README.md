# Codex — How to Execute Tasks in this Repo

**Golden rule:** Read the SoT first:
- `docs/en/codex/architecture/app-status2gpt.md`
- `docs/en/codex/architecture/app-status-index.json`

**Execute in this order on a fresh clone:**
1. `docs/en/codex/001_branch_setup.md`
2. `docs/en/codex/020_start_env_runner.md`
3. `docs/en/codex/030_sot_rules.md`
4. (future) Additional runners for importer/matcher/exporter.

Each runner **must**:
- Be idempotent.
- Append a **changelog** block to `app-status2gpt.md`.
- Keep paths repo-root relative.
