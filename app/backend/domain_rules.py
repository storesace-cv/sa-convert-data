from __future__ import annotations

from functools import lru_cache
from typing import Any

import yaml

from app.config import ROOT


@lru_cache(maxsize=1)
def _load_rules() -> dict[str, Any]:
    """Load the declarative domain rules from ``rules/domain.yml``."""

    rules_path = ROOT / "rules" / "domain.yml"
    if not rules_path.exists():
        return {}

    with rules_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}

    familias_raw: dict[str, dict[str, str]] = data.get("familias", {}) or {}
    synonyms_raw: dict[str, str] = data.get("sinonimos", {}) or {}

    familias: dict[str, dict[str, str]] = {}
    for fam, submap in familias_raw.items():
        fam_key = fam.strip().upper()
        normalized_submap: dict[str, str] = {}
        for sub, label in (submap or {}).items():
            if sub == "_default":
                normalized_submap["_DEFAULT"] = label
            else:
                normalized_submap[sub.strip().upper()] = label
        familias[fam_key] = normalized_submap

    synonyms: dict[str, str] = {
        key.strip().upper(): value.strip().upper()
        for key, value in synonyms_raw.items()
    }

    return {"familias": familias, "sinonimos": synonyms}


def label_from_rules(familia: str | None, subfamilia: str | None) -> str | None:
    """Resolve the canonical label using the declarative YAML rules."""

    rules = _load_rules()
    if not rules:
        return None

    familias: dict[str, dict[str, str]] = rules.get("familias", {})
    synonyms: dict[str, str] = rules.get("sinonimos", {})

    fam_key = (familia or "").strip().upper()
    sub_key = (subfamilia or "").strip().upper()

    if fam_key in synonyms:
        fam_key = synonyms[fam_key]
    if sub_key in synonyms:
        sub_key = synonyms[sub_key]

    submap = familias.get(fam_key)
    if not submap:
        return None

    if sub_key and sub_key in submap:
        return submap[sub_key]

    if "_DEFAULT" in submap:
        return submap["_DEFAULT"]

    return None


def rules_timestamp() -> float:
    """Return the mtime of the domain rules file, useful for cache busting."""

    rules_path = ROOT / "rules" / "domain.yml"
    try:
        return rules_path.stat().st_mtime
    except FileNotFoundError:
        return 0.0


def invalidate_rules_cache() -> None:
    """Clear the in-memory cache so callers can reload updated rules."""

    _load_rules.cache_clear()

