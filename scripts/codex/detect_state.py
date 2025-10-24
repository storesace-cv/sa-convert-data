#!/usr/bin/env python3
import os, sys, json, datetime, re
from pathlib import Path

ROOT = Path(".").resolve()
DOCS = ROOT / "docs" / "en" / "codex"
ARCH = DOCS / "architecture"
RUNNERS = DOCS / "runners"
PROGRESS = DOCS / "progress.json"
SOT_INDEX = ARCH / "app-status-index.json"
SOT_TEXT  = ARCH / "app-status2gpt.md"

def load_json(p):
    try:
        return json.loads(p.read_text())
    except Exception:
        return {}

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def recompute_percentages(prog):
    for ph, pdata in prog.get("phases", {}).items():
        tasks = pdata.get("tasks", {})
        if tasks:
            prog["phases"][ph]["percent"] = int(sum(tasks.values())/len(tasks))
        else:
            prog["phases"][ph]["percent"] = pdata.get("percent", 0)
    return prog

def merge_progress(base, incoming):
    out = base.copy()
    out.setdefault("schema", 1)
    out.setdefault("phases", {})
    for ph, pdata in incoming.get("phases", {}).items():
        out["phases"].setdefault(ph, {"title": pdata.get("title", f"Phase {ph}"), "percent": 0, "tasks": {}})
        tasks = out["phases"][ph].setdefault("tasks", {})
        for k, v in pdata.get("tasks", {}).items():
            tasks[k] = max(v, tasks.get(k, 0))
    out["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    return recompute_percentages(out)

def scan_signals():
    paths = [("backend", ["app","main.py"]), ("tests", ["tests"]), ("docs", ["docs"]),
             ("data", ["databases"]), ("rules", ["rules"]), ("tools", ["tools"]),
             ("launchers", ["launcher","start.sh"]), ("venv", [".venv"]), ("ci", [".github/workflows"])]
    found = {}
    for key, candidates in paths:
        hit = []
        for c in candidates:
            if (ROOT / c).exists():
                hit.append(c)
        found[key] = hit
    return found

def inferred_progress(signals):
    phases = {
        "1": {"title":"Foundation","tasks":{}},
        "2": {"title":"Core Pipeline","tasks":{}},
        "3": {"title":"Observability & Docs","tasks":{}},
        "4": {"title":"Integrations & QA","tasks":{}},
        "5": {"title":"Release & Ops","tasks":{}},
    }
    if signals.get("venv"): phases["1"]["tasks"]["venv_present"]=100
    if signals.get("launchers"): phases["1"]["tasks"]["launcher_present"]=100
    phases["1"]["tasks"]["repo_initialized"]=100

    if signals.get("backend"): phases["2"]["tasks"]["normalization"]=50
    if signals.get("rules"): phases["2"]["tasks"]["classification_rules"]=50
    if signals.get("tests"): phases["2"]["tasks"]["unit_tests"]=80

    if signals.get("docs"): phases["3"]["tasks"]["codex_docs"]=50
    if signals.get("data"): phases["4"]["tasks"]["db_migrate_init"]=20

    return {"phases": phases}

def main():
    write = "--write" in sys.argv
    base = load_json(PROGRESS) if PROGRESS.exists() else {"schema":1,"phases":{}}
    signals = scan_signals()
    inferred = inferred_progress(signals)
    merged = merge_progress(base, inferred)

    if write:
        write_json(PROGRESS, merged)
        sot = {
            "version": 1,
            "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "sources": {
                "text": str(SOT_TEXT),
                "progress": str(PROGRESS),
                "runners_dir": str(RUNNERS)
            },
            "signals": signals,
        }
        write_json(SOT_INDEX, sot)
        txt = "# App Status — SoT (sa-convert-data)\n"
        txt += f"\n_Last updated: {datetime.datetime.utcnow().isoformat()}Z_\n"
        SOT_TEXT.write_text(txt)
    else:
        print(json.dumps({"signals": signals, "inferred": inferred, "merged": merged}, indent=2))

if __name__ == "__main__":
    main()
