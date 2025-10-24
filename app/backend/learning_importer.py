from __future__ import annotations

import os
import re
import sqlite3
from typing import Any, Dict, List

from openpyxl import load_workbook

from app.backend.audit import log_action
from app.backend.db import connect, init_db, now_utc
from app.backend.domain_rules import label_from_rules
from app.backend.text_norm import normalize_name
from app.backend.cardex_schema import normalize_header_label


def _resolve_canonical_label(
    scope: str,
    familia: str | None,
    subfamilia: str | None,
    term_norm: str,
) -> str:
    label = label_from_rules(familia, subfamilia, scope=scope)
    if label:
        return label
    head = (term_norm.split(" ") or ["ITEM"])[0]
    return f"{head} (m)"


def _split_synonyms(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, (list, tuple, set)):
        values = [str(item) for item in raw if str(item).strip()]
    else:
        text = str(raw)
        values = [part.strip() for part in re.split(r"[;,\n]+", text) if part.strip()]
    return values


def _cell_text(row, idx: int | None) -> str:
    if idx is None:
        return ""
    cell = row[idx]
    if cell is None:
        return ""
    value = cell.value
    if value is None:
        return ""
    return str(value).strip()


def _collect_units(row, columns: dict[str, int | None]) -> dict[str, str | None]:
    units: dict[str, str | None] = {}
    for key, idx in columns.items():
        text = _cell_text(row, idx)
        units[key] = text or None
    return units


def _fingerprint(term_norm: str, explicit: str | None) -> str:
    if explicit and explicit.strip():
        return normalize_name(explicit)
    return term_norm


def learn_from_xlsx(xlsx_path: str, scope: str = "global") -> Dict[str, Any]:
    if not os.path.exists(xlsx_path):
        raise FileNotFoundError(f"Ficheiro não encontrado: {xlsx_path}")

    init_db()

    wb = load_workbook(filename=xlsx_path, read_only=True, data_only=True)
    try:
        ws = wb.active

        header_cells = next(ws.iter_rows(min_row=1, max_row=1))
        headers: List[str] = [str(c.value or "") for c in header_cells]
        normalized_headers = {
            normalize_header_label(header): idx for idx, header in enumerate(headers)
        }

        def require_column(*candidates: str) -> int:
            for candidate in candidates:
                norm = normalize_header_label(candidate)
                if norm in normalized_headers:
                    return normalized_headers[norm]
            raise KeyError(f"Coluna obrigatória não encontrada: {candidates[0]}")

        def optional_column(*candidates: str) -> int | None:
            for candidate in candidates:
                norm = normalize_header_label(candidate)
                if norm in normalized_headers:
                    return normalized_headers[norm]
            return None

        col_nome = require_column("nome")
        col_fam = optional_column("familia")
        col_sub = optional_column("subfamilia")
        col_synonyms = optional_column("sinonimos", "synonyms")
        col_fingerprint = optional_column("fingerprint", "padrao", "pattern")

        unit_columns = {
            "unit_default": optional_column("unidade default", "unit default", "unid default"),
            "unit_compra": optional_column("unidade compra", "unit compra", "unid compra"),
            "unit_stock": optional_column("unidade stock", "unit stock", "unid stock"),
            "unit_log": optional_column(
                "unidade logistica",
                "unit logistica",
                "unit log",
                "unid logistica",
                "unidade log",
            ),
        }

        col_base_hint = optional_column("artigo base", "base article", "base hint")

        conn = connect()

        synonyms_upserted = 0
        canonical_created = 0
        class_map_updates = 0
        group_pattern_updates = 0
        logs_recorded = 0

        with conn:
            for row in ws.iter_rows(min_row=2):
                nome_raw = row[col_nome].value if col_nome < len(row) else None
                if nome_raw is None:
                    continue
                nome = str(nome_raw).strip()
                if not nome:
                    continue

                term_norm = normalize_name(nome)
                familia = _cell_text(row, col_fam)
                subfamilia = _cell_text(row, col_sub)
                canonical_label = _resolve_canonical_label(scope, familia, subfamilia, term_norm)

                cur = conn.execute(
                    "SELECT id FROM canonical_item WHERE name_canonico=? AND scope=?",
                    (canonical_label, scope),
                )
                row_item = cur.fetchone()
                if row_item:
                    canonical_id = row_item[0]
                else:
                    cur = conn.execute(
                        """
                        INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at)
                        VALUES(?,?,?,?)
                        """,
                        (canonical_label, scope, "v1", now_utc()),
                    )
                    canonical_id = cur.lastrowid
                    canonical_created += 1

                synonyms = [term_norm]
                if col_synonyms is not None and col_synonyms < len(row):
                    synonyms.extend(_split_synonyms(row[col_synonyms].value))

                unique_synonyms = {normalize_name(value) for value in synonyms if value}
                for synonym in unique_synonyms:
                    if not synonym:
                        continue
                    try:
                        conn.execute(
                            """
                            INSERT INTO canonical_synonym(scope, term_norm, canonical_id, confidence, source)
                            VALUES(?,?,?,?,?)
                            """,
                            (scope, synonym, canonical_id, 1.0, "learning_file"),
                        )
                        synonyms_upserted += 1
                    except sqlite3.IntegrityError:
                        conn.execute(
                            """
                            UPDATE canonical_synonym
                            SET canonical_id=?, confidence=1.0, source='learning_file'
                            WHERE scope=? AND term_norm=?
                            """,
                            (canonical_id, scope, synonym),
                        )
                        synonyms_upserted += 1

                if familia or subfamilia:
                    fam_value = familia or ""
                    sub_value = subfamilia or ""
                    try:
                        conn.execute(
                            """
                            INSERT INTO class_map(scope, familia, subfamilia, canonical_label, support_count, source)
                            VALUES(?,?,?,?,?,?)
                            """,
                            (scope, fam_value, sub_value, canonical_label, 1, "learning_file"),
                        )
                        class_map_updates += 1
                    except sqlite3.IntegrityError:
                        conn.execute(
                            """
                            UPDATE class_map
                            SET canonical_label=?, support_count=support_count+1
                            WHERE scope=? AND familia=? AND subfamilia=?
                            """,
                            (canonical_label, scope, fam_value, sub_value),
                        )
                        class_map_updates += 1

                fingerprint_value = _fingerprint(
                    term_norm,
                    _cell_text(row, col_fingerprint),
                )

                units = _collect_units(row, unit_columns)
                base_hint = _cell_text(row, col_base_hint) or nome

                try:
                    conn.execute(
                        """
                        INSERT INTO group_pattern(
                            scope, fingerprint, canonical_id,
                            unit_default, unit_compra, unit_stock, unit_log,
                            base_article_hint, support_count, source
                        ) VALUES(?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            scope,
                            fingerprint_value,
                            canonical_id,
                            units.get("unit_default"),
                            units.get("unit_compra"),
                            units.get("unit_stock"),
                            units.get("unit_log"),
                            base_hint,
                            1,
                            "learning_file",
                        ),
                    )
                    group_pattern_updates += 1
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
                            support_count=support_count+1
                        WHERE scope=? AND fingerprint=?
                        """,
                        (
                            canonical_id,
                            units.get("unit_default"),
                            units.get("unit_compra"),
                            units.get("unit_stock"),
                            units.get("unit_log"),
                            base_hint,
                            scope,
                            fingerprint_value,
                        ),
                    )
                    group_pattern_updates += 1

                log_action(
                    conn,
                    scope,
                    "learning_upsert",
                    {
                        "term_norm": term_norm,
                        "canonical_id": canonical_id,
                        "canonical_label": canonical_label,
                        "synonyms": sorted(unique_synonyms),
                        "familia": familia,
                        "subfamilia": subfamilia,
                        "fingerprint": fingerprint_value,
                    },
                )
                logs_recorded += 1
    finally:
        wb.close()

    return {
        "ok": True,
        "file": xlsx_path,
        "scope": scope,
        "synonyms_upserted": synonyms_upserted,
        "canonical_created": canonical_created,
        "class_map_updates": class_map_updates,
        "group_pattern_updates": group_pattern_updates,
        "logs_recorded": logs_recorded,
    }
