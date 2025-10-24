#!/usr/bin/env python3
"""
Retroactively mark Smart-Mode tasks as done when signals are clearly present.
Safe & idempotent: only raises task values; never decreases.
Usage:
  scripts/codex/retro_mark_done.py --apply
"""
import os, sys, json, datetime
from pathlib import Path

ROOT = Path(".").resolve()
PROG = ROOT / "docs" / "en" / "codex" / "progress.json"

def load(p):
    try:
        return json.loads(p.read_text())
    except Exception:
        return {"schema":1,"phases":{}}

def save(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2))

def bump(taskmap, phase, task, value):
    phase_entry = taskmap.setdefault(phase, {"title": f"Phase {phase}","percent":0,"tasks":{}})
    cur = phase_entry["tasks"].get(task, 0)
    if value > cur:
        phase_entry["tasks"][task] = value

def recompute(taskmap):
    for ph, pdata in taskmap.items():
        tasks = pdata.get("tasks", {})
        pdata["percent"] = int(sum(tasks.values())/len(tasks)) if tasks else pdata.get("percent", 0)

def main():
    apply = "--apply" in sys.argv
    data = load(PROG)
    phases = data.setdefault("phases", {})

    # Signals that are obviously true after Smart-Mode bootstrap
    docs_c = (ROOT / "docs" / "en" / "codex").exists()
    sot_idx = (ROOT / "docs" / "en" / "codex" / "architecture" / "app-status-index.json").exists()
    progress_c = (ROOT / "docs" / "en" / "codex" / "progress.json").exists()

    if docs_c and sot_idx:
        bump(phases, "1", "sot_bootstrap", 100)
    if progress_c:
        bump(phases, "3", "progress_ledger", 100)

    # Foundation signals that are typically present
    if (ROOT / ".venv").exists():
        bump(phases, "1", "venv_present", 100)
    if (ROOT / "launcher").exists() or (ROOT / "start.sh").exists():
        bump(phases, "1", "launcher_present", 100)
    bump(phases, "1", "repo_initialized", 100)

    # Recompute percentages
    recompute(phases)
    data["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"

    if apply:
        save(PROG, data)
        print("✓ progress.json updated")
    else:
        print(json.dumps(data, indent=2))

if __name__ == "__main__":
    main()
