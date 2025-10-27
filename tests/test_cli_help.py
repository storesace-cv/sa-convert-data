import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

def run_ok(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    assert proc.returncode == 0, f"Command failed ({cmd}):\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"

def test_tools_help_exist():
    # Each tool should exist or at least --help should not crash if present
    tools = ["tools/learn.py", "tools/classify.py", "tools/export_validate.py"]
    missing = [t for t in tools if not (REPO / t).exists()]
    assert not missing, f"Missing CLI files: {missing}"

def test_learn_help():
    run_ok([sys.executable, "tools/learn.py", "--help"])

def test_classify_help():
    run_ok([sys.executable, "tools/classify.py", "--help"])

def test_export_validate_help():
    run_ok([sys.executable, "tools/export_validate.py", "--help"])
