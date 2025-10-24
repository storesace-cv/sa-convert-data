# Smart-Mode Delta Patch — Retro Mark

This patch adds:
- `scripts/codex/retro_mark_done.py` — safely marks `sot_bootstrap=100` and `progress_ledger=100` when SoT is present.

## Use
```bash
python3 scripts/codex/retro_mark_done.py --apply
scripts/verify_phase_status.sh
jq '.phases' docs/en/codex/progress.json
```
