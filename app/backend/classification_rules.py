"""Helpers to read ``rules/classification_rules.json``."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from app.config import ROOT


RULES_PATH = ROOT / "rules" / "classification_rules.json"


def _load_raw(path: Path = RULES_PATH) -> Dict[str, Any]:
    if not path.exists():
        return {"version": 1, "generated_at": None, "scopes": {}}
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        return {"version": 1, "generated_at": None, "scopes": {}}
    data.setdefault("version", 1)
    data.setdefault("generated_at", None)
    scopes = data.get("scopes")
    if not isinstance(scopes, dict):
        data["scopes"] = {}
    return data


@lru_cache(maxsize=None)
def load_rules(scope: str = "global") -> Dict[str, Any]:
    raw = _load_raw()
    scopes = raw.get("scopes", {}) or {}
    return scopes.get(scope, {"canonical": {}})


def canonical_attrs(scope: str, canonical_id: int | str) -> Dict[str, Any] | None:
    rules = load_rules(scope)
    canonical = rules.get("canonical", {}) or {}
    entry = canonical.get(str(canonical_id))
    if not isinstance(entry, dict):
        return None
    attrs = entry.get("canonical_attrs")
    return attrs if isinstance(attrs, dict) else None


def invalidate_cache() -> None:
    load_rules.cache_clear()

