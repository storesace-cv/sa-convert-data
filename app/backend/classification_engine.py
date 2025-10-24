"""Classification inference utilities.

This module aggregates historical article classifications from ``imported_raw``
records, infers the canonical ``class_tag`` for each ``canonical_item`` and
computes confidence metrics that are exported by ``tools/classify.py``.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
import sqlite3
from typing import Any, Dict, Tuple

from app.backend.db import now_utc
from app.backend.text_norm import normalize_name


MarkedValue = Any


@dataclass
class ClassificationCounts:
    """Vote counters used to infer a canonical ``class_tag``."""

    total_records: int = 0
    votes_compra: int = 0
    votes_compra_venda: int = 0
    votes_venda: int = 0
    votes_generico: int = 0
    votes_producao: int = 0
    votes_producao_venda: int = 0


def _is_marked(value: MarkedValue) -> bool:
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    text = str(value).strip()
    if not text:
        return False
    text = normalize_name(text)
    return text in {"X", "1", "SIM", "YES", "TRUE"}


def _infer_tag_from_counts(counts: ClassificationCounts) -> Tuple[str, Dict[str, Any]]:
    votes_total = counts.votes_compra + counts.votes_compra_venda
    decision: str

    if votes_total == 0:
        decision = "no_votes"
        class_tag = "COMPRA/VENDA"
        confidence = 0.0
    elif counts.votes_compra > counts.votes_compra_venda:
        decision = "dominant_compra"
        class_tag = "COMPRA"
        confidence = counts.votes_compra / votes_total
    elif counts.votes_compra_venda > counts.votes_compra:
        decision = "dominant_compra_venda"
        class_tag = "COMPRA/VENDA"
        confidence = counts.votes_compra_venda / votes_total
    else:
        decision = "tie_default"
        class_tag = "COMPRA/VENDA"
        confidence = counts.votes_compra_venda / votes_total if votes_total else 0.0

    metrics = {
        "support_total": counts.total_records,
        "votes_total": votes_total,
        "votes_compra": counts.votes_compra,
        "votes_compra_venda": counts.votes_compra_venda,
        "votes_venda": counts.votes_venda,
        "votes_generico": counts.votes_generico,
        "votes_producao": counts.votes_producao,
        "votes_producao_venda": counts.votes_producao_venda,
        "confidence": round(confidence, 4),
        "decision": decision,
    }

    return class_tag, metrics


def _init_counts() -> ClassificationCounts:
    return ClassificationCounts()


def collect_classification_votes(
    conn: sqlite3.Connection,
) -> Dict[Tuple[str, int], ClassificationCounts]:
    """Collect vote counts per (scope, canonical_id)."""

    term_index: Dict[str, list[tuple[str, int]]] = defaultdict(list)
    cur = conn.execute(
        "SELECT scope, canonical_id, term_norm FROM canonical_synonym"
    )
    for scope, canonical_id, term_norm in cur.fetchall():
        if not term_norm:
            continue
        term_index.setdefault(term_norm, []).append((scope or "global", int(canonical_id)))

    counts_map: Dict[Tuple[str, int], ClassificationCounts] = defaultdict(_init_counts)

    cur = conn.execute(
        """
        SELECT nome_norm, class_compra, class_venda, class_compra_venda,
               class_generico, class_producao, class_producao_venda
        FROM imported_raw
        """
    )
    for row in cur.fetchall():
        term_norm = row[0]
        if not term_norm:
            continue
        matches = term_index.get(term_norm)
        if not matches:
            continue

        for scope, canonical_id in matches:
            counts = counts_map[(scope, canonical_id)]
            counts.total_records += 1
            if _is_marked(row[1]):
                counts.votes_compra += 1
            if _is_marked(row[2]):
                counts.votes_venda += 1
            if _is_marked(row[3]):
                counts.votes_compra_venda += 1
            if _is_marked(row[4]):
                counts.votes_generico += 1
            if _is_marked(row[5]):
                counts.votes_producao += 1
            if _is_marked(row[6]):
                counts.votes_producao_venda += 1

    return counts_map


def build_classification_rules(
    conn: sqlite3.Connection,
) -> Dict[str, Any]:
    """Return the payload persisted to ``classification_rules.json``."""

    counts_map = collect_classification_votes(conn)

    canonical_cur = conn.execute(
        "SELECT id, name_canonico, scope FROM canonical_item"
    )
    scopes: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"canonical": {}})

    for canonical_id, name_canonico, scope in canonical_cur.fetchall():
        scope_key = (scope or "global").strip() or "global"
        counts = counts_map.get((scope_key, int(canonical_id)), _init_counts())
        class_tag, metrics = _infer_tag_from_counts(counts)
        scopes[scope_key]["canonical"][str(int(canonical_id))] = {
            "name": name_canonico,
            "canonical_attrs": {"class_tag": class_tag},
            "metrics": metrics,
        }

    payload = {
        "version": 1,
        "generated_at": now_utc(),
        "scopes": scopes,
    }
    return payload


def merge_with_existing(
    existing: Dict[str, Any] | None,
    generated: Dict[str, Any],
) -> Dict[str, Any]:
    """Merge new payload with existing metadata to preserve unknown scopes."""

    if not existing:
        return generated

    merged = dict(existing)
    merged["version"] = generated.get("version", existing.get("version", 1))
    merged["generated_at"] = generated.get("generated_at", existing.get("generated_at"))

    scopes_existing = existing.get("scopes", {}) or {}
    scopes_new = generated.get("scopes", {}) or {}

    scopes_combined: Dict[str, Any] = {}
    for scope_key in set(scopes_existing) | set(scopes_new):
        scope_payload = dict(scopes_existing.get(scope_key, {}))
        scope_payload.update(scopes_new.get(scope_key, {}))
        scopes_combined[scope_key] = scope_payload

    merged["scopes"] = scopes_combined
    return merged

