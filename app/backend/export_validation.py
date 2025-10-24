from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Iterable

from app.backend.cardex_schema import CARDEX_FIELD_ORDER

__all__ = [
    "MONETARY_FIELDS",
    "ValidationMetadata",
    "validate_export_rows",
]


MONETARY_FIELDS: frozenset[str] = frozenset(
    {
        "preco_compra_fornecedor",
        "desconto_fornecedor",
        "pvp1_s_com_iva",
        "pvp2_r_com_iva",
        "pvp3_er_com_iva",
        "pvp4_bp2_com_iva",
        "preco5_com_iva",
    }
)

DEFAULT_VALUES: dict[str, Any] = {
    "categoria": "Default",
    "estado": "ATIVO",
}

ROUND_QUANT = Decimal("0.01")


@dataclass(frozen=True)
class ValidationMetadata:
    """Aggregated metadata emitted by :func:`validate_export_rows`."""

    total_rows: int
    missing_columns: dict[str, int]
    rounding_adjustments: list[dict[str, Any]]
    invalid_monetary: list[dict[str, Any]]
    defaults_applied: list[dict[str, Any]]
    extra_fields: list[dict[str, Any]]

    def as_dict(self) -> dict[str, Any]:
        return {
            "total_rows": self.total_rows,
            "missing_columns": self.missing_columns,
            "rounding_adjustments": self.rounding_adjustments,
            "invalid_monetary": self.invalid_monetary,
            "defaults_applied": self.defaults_applied,
            "extra_fields": self.extra_fields,
        }


def _coerce_basic(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else None
    return value


def _coerce_decimal(value: Any) -> tuple[Decimal | None, str | None]:
    if value is None:
        return None, None
    if isinstance(value, (int, float, Decimal)):
        try:
            return Decimal(str(value)), None
        except InvalidOperation:
            return None, "invalid"
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None, None
        normalized = text.replace(" ", "").replace(",", ".")
        try:
            return Decimal(normalized), None
        except InvalidOperation:
            return None, "invalid"
    return None, "invalid"


def _clean_monetary(
    row_index: int,
    field: str,
    value: Any,
    rounding_adjustments: list[dict[str, Any]],
    invalid_monetary: list[dict[str, Any]],
) -> Any:
    decimal_value, error = _coerce_decimal(value)
    if error == "invalid":
        invalid_monetary.append({"row": row_index, "field": field, "input": value})
        return None
    if decimal_value is None:
        return None
    quantized = decimal_value.quantize(ROUND_QUANT, rounding=ROUND_HALF_UP)
    if quantized != decimal_value:
        rounding_adjustments.append(
            {
                "row": row_index,
                "field": field,
                "input": float(decimal_value),
                "output": float(quantized),
            }
        )
    return float(quantized)


def validate_export_rows(
    rows: Iterable[dict[str, Any]]
) -> tuple[list[dict[str, Any]], ValidationMetadata]:
    cleaned_rows: list[dict[str, Any]] = []
    missing_counter: Counter[str] = Counter()
    rounding_adjustments: list[dict[str, Any]] = []
    invalid_monetary: list[dict[str, Any]] = []
    defaults_applied: list[dict[str, Any]] = []
    extra_fields: list[dict[str, Any]] = []

    for index, row in enumerate(rows):
        cleaned: dict[str, Any] = {}
        seen_fields = set(row.keys())
        extras = sorted(seen_fields.difference(CARDEX_FIELD_ORDER))
        if extras:
            extra_fields.append({"row": index, "fields": extras})
        for key in CARDEX_FIELD_ORDER:
            if key not in row:
                missing_counter[key] += 1
            value = _coerce_basic(row.get(key))
            if key in MONETARY_FIELDS:
                cleaned[key] = _clean_monetary(
                    index, key, value, rounding_adjustments, invalid_monetary
                )
            else:
                cleaned[key] = value
        for field, default in DEFAULT_VALUES.items():
            if cleaned.get(field) in (None, ""):
                cleaned[field] = default
                defaults_applied.append({"row": index, "field": field, "value": default})
        cleaned_rows.append(cleaned)

    metadata = ValidationMetadata(
        total_rows=len(cleaned_rows),
        missing_columns=dict(missing_counter),
        rounding_adjustments=rounding_adjustments,
        invalid_monetary=invalid_monetary,
        defaults_applied=defaults_applied,
        extra_fields=extra_fields,
    )
    return cleaned_rows, metadata
