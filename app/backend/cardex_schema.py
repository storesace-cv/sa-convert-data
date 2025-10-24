from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


def normalize_header_label(value: object | None) -> str:
    """Normalize a header label so that spelling variants can be matched."""

    if value is None:
        return ""

    text = str(value).strip()
    if not text:
        return ""

    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("::", " ")
    text = re.sub(r"[^0-9A-Za-z]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


@dataclass(frozen=True)
class ColumnSpec:
    key: str
    header_variants: tuple[str, ...]
    sqlite_type: str = "TEXT"

    def normalized_variants(self) -> set[str]:
        return {normalize_header_label(v) for v in self.header_variants}


CARDEX_IMPORT_COLUMNS: list[ColumnSpec] = [
    ColumnSpec("cod_artigo", ("Cód. Artigo",)),
    ColumnSpec("cod_barras", ("Cód. Barras",)),
    ColumnSpec("nome", ("Nome Artigo",)),
    ColumnSpec("desc_curta1", ("Desc. Curta 1",)),
    ColumnSpec("desc_curta2", ("Desc. Curta 2",)),
    ColumnSpec("categoria", ("Categoria",)),
    ColumnSpec("familia", ("Família",)),
    ColumnSpec("subfamilia", ("Subfamília",)),
    ColumnSpec("class_compra", ("Artigo - Classificação::Compra", "Compra")),
    ColumnSpec("class_venda", ("Artigo - Classificação::Venda", "Venda")),
    ColumnSpec(
        "class_compra_venda",
        ("Artigo - Classificação::Compra/Venda", "Compra/Venda"),
    ),
    ColumnSpec("class_generico", ("Artigo - Classificação::Genérico", "Genérico")),
    ColumnSpec("class_producao", ("Artigo - Classificação::Produção", "Produção")),
    ColumnSpec(
        "class_producao_venda",
        ("Artigo - Classificação::Produção/Venda", "Produção/Venda"),
    ),
    ColumnSpec("unid_default", ("Unidade::Default", "Default")),
    ColumnSpec("unid_compra", ("Unidade::Compra", "Compra")),
    ColumnSpec("unid_stock", ("Unidade::Stock", "Stock")),
    ColumnSpec("unid_log", ("Unidade::Logística", "Logística")),
    ColumnSpec(
        "contribui_generico_codigo",
        ("Contribui para o Genérico (código)",),
    ),
    ColumnSpec("fornecedor", ("Fornecedor",)),
    ColumnSpec("fornecedor_identificador", ("Identificador Fornecedor",)),
    ColumnSpec("fornecedor_cod_artigo", ("Cód. Artigo Fornecedor",)),
    ColumnSpec("fornecedor_cod_barras", ("Cód.  Barras Fornecedor",)),
    ColumnSpec("fornecedor_descricao", ("Descrição Art. Fornecedor",)),
    ColumnSpec(
        "preco_compra_fornecedor", ("Preço Compra Fornecedor s/ IVA",),
    ),
    ColumnSpec("desconto_fornecedor", ("Desconto Fornecedor",)),
    ColumnSpec("pvp1_s_com_iva", ("P.V.P. 1 [S] c/ IVA",)),
    ColumnSpec("pvp2_r_com_iva", ("P.V.P. 2 [R] c/ IVA",)),
    ColumnSpec("pvp3_er_com_iva", ("P.V.P. 3 [ER] c/ IVA",)),
    ColumnSpec("pvp4_bp2_com_iva", ("P.V.P. 4 [BP2] c/ IVA",)),
    ColumnSpec("preco5_com_iva", ("Preço 5 c/ IVA",)),
    ColumnSpec("tipo_iva", ("Tipo IVA",)),
    ColumnSpec("tabela_precos", ("Tabela de Preços",)),
    ColumnSpec("estado", ("Estado",)),
    ColumnSpec("menu_online", ("Menu Online",)),
    ColumnSpec("tipo_artigo_online", ("Tipo Artigo Online",)),
    ColumnSpec("ordem_tipo_artigo_online", ("Ordem - Tipo Artigo Online",)),
    ColumnSpec("classe_ordenacao1", ("Classe Ordenação 1",)),
    ColumnSpec(
        "ordem_classe_ordenacao1",
        ("Ordem - Classe Ordenação 1",),
    ),
    ColumnSpec(
        "ordem_classe_ordenacao2",
        ("Ordem - Classe Ordenação 2",),
    ),
    ColumnSpec("classe_ordenacao2", ("Classe Ordenação 2",)),
]


CARDEX_FIELD_ORDER: list[str] = [spec.key for spec in CARDEX_IMPORT_COLUMNS]


def imported_raw_columns(include_created_at: bool = True) -> list[str]:
    """Return the ordered list of columns persisted in imported_raw."""

    cols: list[str] = [
        "batch_id",
        "row_index",
        "cod_artigo",
        "cod_barras",
        "nome",
        "nome_norm",
        "desc1",
        "desc2",
    ]
    cols.extend(
        key
        for key in CARDEX_FIELD_ORDER
        if key not in {"cod_artigo", "cod_barras", "nome"}
    )
    if include_created_at:
        cols.append("created_at")
    return cols


def imported_raw_column_types() -> list[tuple[str, str]]:
    columns: list[tuple[str, str]] = [
        ("batch_id", "TEXT NOT NULL"),
        ("row_index", "INTEGER NOT NULL"),
        ("cod_artigo", "TEXT"),
        ("cod_barras", "TEXT"),
        ("nome", "TEXT"),
        ("nome_norm", "TEXT"),
        ("desc1", "TEXT"),
        ("desc2", "TEXT"),
    ]
    for spec in CARDEX_IMPORT_COLUMNS:
        if spec.key in {"cod_artigo", "cod_barras", "nome"}:
            continue
        columns.append((spec.key, spec.sqlite_type))
    columns.append(("created_at", "TEXT NOT NULL"))
    return columns

