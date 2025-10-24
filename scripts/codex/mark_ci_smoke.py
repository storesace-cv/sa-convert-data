#!/usr/bin/env python3
"""
Mark ci_smoke=100 when a GitHub Actions workflow is present in .github/workflows.
Idempotent; only raises values.
"""
import json, datetime
from pathlib import Path

ROOT = Path(".").resolve()
PROG = ROOT / "docs" / "en" / "codex" / "progress.json"
WF_DIR = ROOT / ".github" / "workflows"

def load_json(p):
    try:
        return json.loads(p.read_text())
    except Exception:
        return {"schema":1,"phases":{}}

def save_json(p, data):
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
    data = load_json(PROG)
    phases = data.setdefault("phases", {})
    if WF_DIR.exists() and any(WF_DIR.glob("*.yml")) or any(WF_DIR.glob("*.yaml")):
        bump(phases, "1", "ci_smoke", 100)
    recompute(phases)
    data["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    save_json(PROG, data)
    print("✓ ci_smoke updated (if workflow present)")

if __name__ == "__main__":
    main()
