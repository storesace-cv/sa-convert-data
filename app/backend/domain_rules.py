from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover - optional dependency fallback
    yaml = None

from app.config import ROOT


def _candidate_rule_files(scope: str) -> List[Path]:
    """Return the list of YAML files that contribute rules for ``scope``."""

    base_dir = ROOT / "rules"
    scope_key = (scope or "global").strip()
    candidates: List[Path] = [base_dir / "domain.yml"]

    additional: List[Path] = []
    if scope_key and scope_key.lower() != "global":
        additional.extend(
            [
                base_dir / f"{scope_key}.yml",
                base_dir / f"{scope_key}.yaml",
                base_dir / scope_key / "domain.yml",
                base_dir / "scopes" / f"{scope_key}.yml",
                base_dir / "scopes" / f"{scope_key}.yaml",
                base_dir / "scopes" / scope_key / "domain.yml",
            ]
        )

    for path in additional:
        if path not in candidates:
            candidates.append(path)

    return candidates


def _candidate_csv_files(scope: str) -> Dict[str, List[Path]]:
    base_dir = ROOT / "rules"
    scope_key = (scope or "global").strip()

    targets: Dict[str, List[Path]] = {
        "sinonimos": [],
        "familias": [],
        "proibicoes": [],
    }

    locations: List[Path] = [base_dir]
    if scope_key and scope_key.lower() != "global":
        locations.extend(
            [
                base_dir / scope_key,
                base_dir / "scopes" / scope_key,
            ]
        )

    for folder in locations:
        if not folder.exists() or not folder.is_dir():
            continue
        for key in list(targets.keys()):
            for suffix in (".csv", ".CSV"):
                candidate = folder / f"{key}{suffix}"
                if candidate.exists():
                    targets[key].append(candidate)

    return targets


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists() or yaml is None:
        return {}
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return data if isinstance(data, dict) else {}


def _sniff_delimiter(path: Path) -> str:
    try:
        with path.open("r", encoding="utf-8") as handle:
            sample = handle.read(1024)
            handle.seek(0)
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
            return dialect.delimiter
    except Exception:
        return ";"


def _load_csv_rows(path: Path) -> List[List[str]]:
    delimiter = _sniff_delimiter(path)
    rows: List[List[str]] = []
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.reader(handle, delimiter=delimiter)
        for row in reader:
            if not row:
                continue
            cleaned = [col.strip() for col in row]
            if not any(cleaned):
                continue
            rows.append(cleaned)
    return rows


def _merge_synonyms(target: dict[str, str], rows: Iterable[Iterable[str]]) -> None:
    for row in rows:
        if len(row) < 2:
            continue
        alias, canonical = row[0], row[1]
        if not alias or not canonical:
            continue
        target[alias.strip().upper()] = canonical.strip().upper()


def _merge_families(target: dict[str, dict[str, str]], rows: Iterable[Iterable[str]]) -> None:
    for row in rows:
        if len(row) < 3:
            continue
        fam, subfam, label = row[0], row[1], row[2]
        fam_key = fam.strip().upper()
        sub_key = subfam.strip().upper() if subfam.strip() else "_DEFAULT"
        if fam_key not in target:
            target[fam_key] = {}
        target[fam_key][sub_key] = label


def _merge_prohibitions(target: List[Tuple[str, ...]], rows: Iterable[Iterable[str]]) -> None:
    for row in rows:
        values = tuple(col.strip().upper() for col in row if col.strip())
        if len(values) >= 2:
            target.append(values)


def _normalize_familias(raw: dict[str, Any]) -> dict[str, dict[str, str]]:
    familias: dict[str, dict[str, str]] = {}
    for fam, submap in (raw or {}).items():
        fam_key = str(fam).strip().upper()
        if not fam_key:
            continue
        existing = familias.setdefault(fam_key, {})
        for sub, label in (submap or {}).items():
            if sub is None:
                continue
            sub_key = str(sub).strip().upper()
            if sub_key == "_DEFAULT" or sub == "_default":
                existing["_DEFAULT"] = label
            else:
                existing[sub_key] = label
    return familias


def _normalize_synonyms(raw: dict[str, Any]) -> dict[str, str]:
    return {
        str(key).strip().upper(): str(value).strip().upper()
        for key, value in (raw or {}).items()
        if key is not None and value is not None and str(key).strip() and str(value).strip()
    }


def _normalize_prohibitions(raw: Any) -> List[Tuple[str, ...]]:
    result: List[Tuple[str, ...]] = []
    if isinstance(raw, list):
        for entry in raw:
            if isinstance(entry, (list, tuple)):
                values = tuple(str(item).strip().upper() for item in entry if str(item).strip())
                if len(values) >= 2:
                    result.append(values)
    return result


@lru_cache(maxsize=None)
def _load_rules(scope: str = "global") -> dict[str, Any]:
    """Load the declarative domain rules merged for ``scope``."""

    familias: dict[str, dict[str, str]] = {}
    synonyms: dict[str, str] = {}
    prohibitions: List[Tuple[str, ...]] = []

    for yaml_path in _candidate_rule_files(scope):
        data = _load_yaml(yaml_path)
        if not data:
            continue
        familias_raw = _normalize_familias(data.get("familias", {}))
        for fam_key, submap in familias_raw.items():
            existing = familias.setdefault(fam_key, {})
            existing.update(submap)
        synonyms.update(_normalize_synonyms(data.get("sinonimos", {})))
        prohibitions.extend(_normalize_prohibitions(data.get("proibicoes")))

    csv_paths = _candidate_csv_files(scope)
    for syn_path in csv_paths.get("sinonimos", []):
        _merge_synonyms(synonyms, _load_csv_rows(syn_path))
    for fam_path in csv_paths.get("familias", []):
        _merge_families(familias, _load_csv_rows(fam_path))
    for ban_path in csv_paths.get("proibicoes", []):
        _merge_prohibitions(prohibitions, _load_csv_rows(ban_path))

    return {
        "familias": familias,
        "sinonimos": synonyms,
        "proibicoes": prohibitions,
    }


def label_from_rules(
    familia: str | None,
    subfamilia: str | None,
    scope: str = "global",
) -> str | None:
    """Resolve the canonical label using the declarative rules for ``scope``."""

    rules = _load_rules(scope)
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


def prohibitions(scope: str = "global") -> List[Tuple[str, ...]]:
    """Return the list of mutually-exclusive tokens configured for ``scope``."""

    rules = _load_rules(scope)
    return list(rules.get("proibicoes", []))


def rules_timestamp(scope: str = "global") -> float:
    """Return the mtime of the most specific rules for ``scope``."""

    candidates = _candidate_rule_files(scope)
    try:
        return max(path.stat().st_mtime for path in candidates if path.exists())
    except ValueError:
        return 0.0


def invalidate_rules_cache() -> None:
    """Clear the in-memory cache so callers can reload updated rules."""

    _load_rules.cache_clear()

