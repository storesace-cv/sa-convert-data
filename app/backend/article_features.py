from __future__ import annotations

import dataclasses
import re
import unicodedata
from typing import Iterable

from app.backend.text_norm import normalize_name


STOP_WORDS: set[str] = {
    "DE",
    "DA",
    "DO",
    "DAS",
    "DOS",
    "E",
    "A",
    "O",
    "AS",
    "OS",
    "EM",
    "PARA",
    "POR",
    "COM",
    "SEM",
    "UM",
    "UMA",
    "UN",
    "UNS",
    "UAS",
}


UNIT_NORMALIZATION: dict[str, str] = {
    "GR": "G",
    "GRS": "G",
    "GRAMAS": "G",
    "GRAM": "G",
    "G": "G",
    "KG": "KG",
    "KGS": "KG",
    "KILO": "KG",
    "KILOS": "KG",
    "QUILO": "KG",
    "QUILOS": "KG",
    "L": "L",
    "LT": "L",
    "LTS": "L",
    "LTR": "L",
    "LITRO": "L",
    "LITROS": "L",
    "CL": "CL",
    "ML": "ML",
    "UN": "UN",
    "UNID": "UN",
    "UNIDS": "UN",
    "UNID.": "UN",
    "UNIDADE": "UN",
    "UNIDADES": "UN",
    "PACK": "UN",
    "CX": "UN",
    "CXS": "UN",
    "PCT": "UN",
    "PCTS": "UN",
}


UNIT_PATTERN = re.compile(
    r"\b(" + "|".join(sorted({re.escape(k) for k in UNIT_NORMALIZATION})) + r")\b"
)


QUANTITY_PATTERN = re.compile(
    r"(?:(?P<count>\d+)\s*(?:X|×|\*)\s*)?(?P<value>\d+(?:[.,]\d+)?)\s*(?P<unit>KG|G|L|ML|CL|UN)\b"
)


KNOWN_BRANDS: set[str] = {
    "CONTINENTE",
    "MILANEZA",
    "NESTLE",
    "NESCAFE",
    "GULOSO",
    "GUD",
    "AGROS",
    "RAM",
    "DELTA",
    "SIDUL",
}


@dataclasses.dataclass(slots=True)
class QuantityInfo:
    value: float | None
    total: float | None
    unit: str | None
    count: float | None
    kind: str | None


@dataclasses.dataclass(slots=True)
class ArticleFeatures:
    nome_norm: str
    nome_sem_stop: str
    quantidade_valor: float | None
    quantidade_total: float | None
    quantidade_unidade: str | None
    quantidade_tipo: str | None
    quantidade_numero: float | None
    flag_com_sal: bool
    flag_sem_sal: bool
    marca_detectada: str | None


def _normalize_units(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        return UNIT_NORMALIZATION.get(match.group(0), match.group(0))

    return UNIT_PATTERN.sub(repl, text)


def _normalize_decimal(value: str) -> float | None:
    cleaned = value.replace(" ", "")
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "")
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _prepare_quantity_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.upper().replace("×", "X")
    normalized = re.sub(r"[^0-9A-Z,.*X]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def parse_quantity(text: str) -> QuantityInfo:
    normalized = _normalize_units(_prepare_quantity_text(text))
    match = QUANTITY_PATTERN.search(normalized)
    if not match:
        return QuantityInfo(None, None, None, None, None)

    raw_value = _normalize_decimal(match.group("value"))
    if raw_value is None:
        return QuantityInfo(None, None, match.group("unit"), None, None)
    count = match.group("count")
    count_value: float | None = float(count) if count is not None else None
    unit = match.group("unit")
    if unit == "KG":
        base_value = raw_value * 1000.0
        kind = "MASS"
    elif unit == "G":
        base_value = raw_value
        kind = "MASS"
    elif unit == "L":
        base_value = raw_value * 1000.0
        kind = "VOLUME"
    elif unit == "CL":
        base_value = raw_value * 10.0
        kind = "VOLUME"
    elif unit == "ML":
        base_value = raw_value
        kind = "VOLUME"
    else:
        base_value = raw_value
        kind = "COUNT"

    total = base_value * count_value if count_value is not None else base_value

    return QuantityInfo(
        value=base_value,
        total=total,
        unit=unit,
        count=count_value,
        kind=kind,
    )


def _remove_stop_words(tokens: Iterable[str]) -> list[str]:
    return [tok for tok in tokens if tok not in STOP_WORDS]


def _detect_brand(tokens: list[str]) -> str | None:
    fallback: str | None = None
    for token in tokens:
        if token in STOP_WORDS:
            continue
        if token in {"COM", "SEM"}:
            continue
        if token in {"KG", "G", "ML", "L", "CL", "UN"}:
            continue
        if re.fullmatch(r"\d+(?:[.,]\d+)?", token):
            continue
        if token in KNOWN_BRANDS:
            return token
        if fallback is None:
            fallback = token
    return fallback


def compute_article_features(nome: str) -> ArticleFeatures:
    nome_norm = normalize_name(nome)
    tokens = nome_norm.split()
    tokens_no_stop = _remove_stop_words(tokens)
    nome_sem_stop = " ".join(tokens_no_stop)

    quantity = parse_quantity(nome)
    has_com_sal = "COM SAL" in nome_norm
    has_sem_sal = "SEM SAL" in nome_norm

    brand = _detect_brand(tokens)

    return ArticleFeatures(
        nome_norm=nome_norm,
        nome_sem_stop=nome_sem_stop,
        quantidade_valor=quantity.value,
        quantidade_total=quantity.total,
        quantidade_unidade=quantity.unit,
        quantidade_tipo=quantity.kind,
        quantidade_numero=quantity.count,
        flag_com_sal=has_com_sal,
        flag_sem_sal=has_sem_sal,
        marca_detectada=brand,
    )

