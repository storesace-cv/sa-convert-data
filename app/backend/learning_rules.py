from __future__ import annotations

import json
import sqlite3
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List

from app.backend.db import now_utc
from app.backend.text_norm import normalize_name


DEFAULT_VERSION = 1


def _scope_key(scope: str | None) -> str:
    key = (scope or "global").strip() or "global"
    return key


def default_rules() -> dict[str, Any]:
    return {"version": DEFAULT_VERSION, "updated_at": now_utc(), "scopes": {}}


def load_rules(path: str | Path) -> dict[str, Any]:
    target = Path(path)
    if not target.exists():
        return default_rules()
    with target.open("r", encoding="utf-8") as handle:
        try:
            data = json.load(handle)
        except json.JSONDecodeError:
            return default_rules()
    if not isinstance(data, dict):
        return default_rules()
    scopes = data.get("scopes")
    if not isinstance(scopes, dict):
        data["scopes"] = {}
    if "version" not in data:
        data["version"] = DEFAULT_VERSION
    if "updated_at" not in data:
        data["updated_at"] = now_utc()
    return data


def save_rules(path: str | Path, data: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2, sort_keys=True)


def _ensure_canonical(
    conn: sqlite3.Connection,
    scope: str,
    label: str,
) -> int:
    cur = conn.execute(
        "SELECT id FROM canonical_item WHERE scope=? AND name_canonico=?",
        (scope, label),
    )
    row = cur.fetchone()
    if row:
        return int(row[0])
    cur = conn.execute(
        """
        INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at)
        VALUES(?,?,?,?)
        """,
        (label, scope, "v1", now_utc()),
    )
    return int(cur.lastrowid)


def _upsert_synonym(
    conn: sqlite3.Connection,
    scope: str,
    canonical_id: int,
    term: str,
    *,
    source: str,
) -> None:
    norm = normalize_name(term)
    if not norm:
        return
    try:
        conn.execute(
            """
            INSERT INTO canonical_synonym(scope, term_norm, canonical_id, confidence, source)
            VALUES(?,?,?,?,?)
            """,
            (scope, norm, canonical_id, 1.0, source),
        )
    except sqlite3.IntegrityError:
        conn.execute(
            """
            UPDATE canonical_synonym
            SET canonical_id=?, confidence=1.0, source=?
            WHERE scope=? AND term_norm=?
            """,
            (canonical_id, source, scope, norm),
        )


def _upsert_class_map(
    conn: sqlite3.Connection,
    scope: str,
    familia: str | None,
    subfamilia: str | None,
    canonical_label: str,
    *,
    source: str,
) -> None:
    fam_value = normalize_name(familia) if familia else ""
    sub_value = normalize_name(subfamilia) if subfamilia else ""
    if not fam_value and not sub_value:
        return
    try:
        conn.execute(
            """
            INSERT INTO class_map(scope, familia, subfamilia, canonical_label, support_count, source)
            VALUES(?,?,?,?,?,?)
            """,
            (scope, fam_value, sub_value, canonical_label, 1, source),
        )
    except sqlite3.IntegrityError:
        conn.execute(
            """
            UPDATE class_map
            SET canonical_label=?, support_count=support_count+1, source=?
            WHERE scope=? AND familia=? AND subfamilia=?
            """,
            (canonical_label, source, scope, fam_value, sub_value),
        )


def _upsert_pattern(
    conn: sqlite3.Connection,
    scope: str,
    canonical_id: int,
    fingerprint: str,
    units: Dict[str, Any],
    base_hint: str | None,
    support_count: int,
    *,
    source: str,
) -> None:
    finger = normalize_name(fingerprint)
    if not finger:
        return
    payload = (
        scope,
        finger,
        canonical_id,
        units.get("unit_default"),
        units.get("unit_compra"),
        units.get("unit_stock"),
        units.get("unit_log"),
        base_hint,
        support_count,
        source,
    )
    try:
        conn.execute(
            """
            INSERT INTO group_pattern(
                scope, fingerprint, canonical_id,
                unit_default, unit_compra, unit_stock, unit_log,
                base_article_hint, support_count, source
            ) VALUES(?,?,?,?,?,?,?,?,?,?)
            """,
            payload,
        )
    except sqlite3.IntegrityError:
        conn.execute(
            """
            UPDATE group_pattern
            SET canonical_id=?,
                unit_default=COALESCE(?, unit_default),
                unit_compra=COALESCE(?, unit_compra),
                unit_stock=COALESCE(?, unit_stock),
                unit_log=COALESCE(?, unit_log),
                base_article_hint=COALESCE(?, base_article_hint),
                support_count=max(support_count, ?),
                source=?
            WHERE scope=? AND fingerprint=?
            """,
            (
                canonical_id,
                units.get("unit_default"),
                units.get("unit_compra"),
                units.get("unit_stock"),
                units.get("unit_log"),
                base_hint,
                support_count,
                source,
                scope,
                finger,
            ),
        )


def _upsert_pair_judgement(
    conn: sqlite3.Connection,
    scope: str,
    left: str,
    right: str,
    label: str,
    support_count: int,
    *,
    source: str,
) -> None:
    l_norm = normalize_name(left)
    r_norm = normalize_name(right)
    if not l_norm or not r_norm:
        return
    if l_norm > r_norm:
        l_norm, r_norm = r_norm, l_norm
    try:
        conn.execute(
            """
            INSERT INTO pair_judgement(scope, left_term_norm, right_term_norm, label, support_count, source)
            VALUES(?,?,?,?,?,?)
            """,
            (scope, l_norm, r_norm, label, support_count or 1, source),
        )
    except sqlite3.IntegrityError:
        conn.execute(
            """
            UPDATE pair_judgement
            SET support_count=max(support_count, ?), source=?
            WHERE scope=? AND left_term_norm=? AND right_term_norm=? AND label=?
            """,
            (support_count or 1, source, scope, l_norm, r_norm, label),
        )


def apply_rules(
    conn: sqlite3.Connection,
    rules: dict[str, Any],
    scope: str,
) -> Dict[str, int]:
    summary = {
        "canonical": 0,
        "synonyms": 0,
        "class_map": 0,
        "patterns": 0,
        "pair_judgements": 0,
    }

    scope_payload = (rules.get("scopes") or {}).get(_scope_key(scope))
    if not scope_payload:
        return summary

    items = scope_payload.get("items", [])
    for item in items:
        label = item.get("label")
        if not label:
            continue
        canonical_id = _ensure_canonical(conn, _scope_key(scope), label)
        summary["canonical"] += 1

        for synonym in item.get("synonyms", []):
            _upsert_synonym(
                conn,
                _scope_key(scope),
                canonical_id,
                synonym,
                source="learning_rules",
            )
            summary["synonyms"] += 1

        for fam in item.get("familias", []):
            if not isinstance(fam, dict):
                continue
            _upsert_class_map(
                conn,
                _scope_key(scope),
                fam.get("familia"),
                fam.get("subfamilia"),
                label,
                source="learning_rules",
            )
            summary["class_map"] += 1

        for pattern in item.get("patterns", []):
            if not isinstance(pattern, dict):
                continue
            units = pattern.get("units") or {}
            base_hint = pattern.get("base_article_hint")
            support = int(pattern.get("support_count", 1) or 1)
            _upsert_pattern(
                conn,
                _scope_key(scope),
                canonical_id,
                pattern.get("fingerprint", ""),
                units,
                base_hint,
                support,
                source="learning_rules",
            )
            summary["patterns"] += 1

    for entry in scope_payload.get("pair_judgements", []):
        if not isinstance(entry, dict):
            continue
        _upsert_pair_judgement(
            conn,
            _scope_key(scope),
            entry.get("left"),
            entry.get("right"),
            entry.get("label", "duplicate"),
            int(entry.get("support_count", 1) or 1),
            source="learning_rules",
        )
        summary["pair_judgements"] += 1

    return summary


def dump_scope(conn: sqlite3.Connection, scope: str) -> dict[str, Any]:
    scope_id = _scope_key(scope)
    items: List[dict[str, Any]] = []

    cur = conn.execute(
        "SELECT id, name_canonico FROM canonical_item WHERE scope=? ORDER BY name_canonico",
        (scope_id,),
    )
    for canonical_id, label in cur.fetchall():
        synonyms_cur = conn.execute(
            """
            SELECT term_norm FROM canonical_synonym
            WHERE scope=? AND canonical_id=?
            ORDER BY term_norm
            """,
            (scope_id, canonical_id),
        )
        synonyms = [row[0] for row in synonyms_cur.fetchall()]

        families_cur = conn.execute(
            """
            SELECT familia, subfamilia
            FROM class_map
            WHERE scope=? AND canonical_label=?
            ORDER BY familia, subfamilia
            """,
            (scope_id, label),
        )
        familias = [
            {"familia": row[0] or "", "subfamilia": row[1] or ""}
            for row in families_cur.fetchall()
        ]

        patterns_cur = conn.execute(
            """
            SELECT fingerprint, unit_default, unit_compra, unit_stock, unit_log, base_article_hint, support_count
            FROM group_pattern
            WHERE scope=? AND canonical_id=?
            ORDER BY fingerprint
            """,
            (scope_id, canonical_id),
        )
        patterns = [
            {
                "fingerprint": row[0],
                "units": {
                    "unit_default": row[1],
                    "unit_compra": row[2],
                    "unit_stock": row[3],
                    "unit_log": row[4],
                },
                "base_article_hint": row[5],
                "support_count": row[6],
            }
            for row in patterns_cur.fetchall()
        ]

        items.append(
            {
                "label": label,
                "synonyms": synonyms,
                "familias": familias,
                "patterns": patterns,
            }
        )

    pair_rows = conn.execute(
        """
        SELECT left_term_norm, right_term_norm, label, support_count
        FROM pair_judgement
        WHERE scope=?
        ORDER BY left_term_norm, right_term_norm, label
        """,
        (scope_id,),
    ).fetchall()

    pair_judgements = [
        {
            "left": row[0],
            "right": row[1],
            "label": row[2],
            "support_count": row[3],
        }
        for row in pair_rows
    ]

    return {"items": items, "pair_judgements": pair_judgements}


def merge_rules(
    base: dict[str, Any],
    scope: str,
    scope_payload: dict[str, Any],
) -> dict[str, Any]:
    merged = deepcopy(base) if base else default_rules()
    merged.setdefault("version", DEFAULT_VERSION)
    merged.setdefault("scopes", {})
    merged["scopes"][_scope_key(scope)] = scope_payload
    merged["updated_at"] = now_utc()
    return merged


def prune_scope(base: dict[str, Any], scope: str) -> dict[str, Any]:
    cleaned = deepcopy(base) if base else default_rules()
    scopes = dict(cleaned.get("scopes", {}))
    key = _scope_key(scope)
    if key in scopes:
        scopes.pop(key, None)
        cleaned["scopes"] = scopes
        cleaned["updated_at"] = now_utc()
    return cleaned

