from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Any, Dict, List

from rapidfuzz.distance import JaroWinkler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors

from app.backend.db import connect, init_db, now_utc
from app.backend.domain_rules import label_from_rules


@dataclass(slots=True)
class ArticleRecord:
    id: int
    nome_norm: str
    nome_sem_stop: str
    familia: str
    subfamilia: str
    quantidade_total: float | None
    quantidade_unidade: str | None
    quantidade_tipo: str | None
    flag_com_sal: bool
    flag_sem_sal: bool
    marca_detectada: str | None

    @property
    def significant_token(self) -> str:
        tokens = [tok for tok in self.nome_sem_stop.split() if tok]
        if tokens:
            return tokens[0]
        fallback = (self.nome_norm.split(" ") or ["ITEM"])[0]
        return fallback

    @property
    def familia_norm(self) -> str:
        return (self.familia or "").strip().upper()

    @property
    def subfamilia_norm(self) -> str:
        return (self.subfamilia or "").strip().upper()

    @property
    def critical_signature(self) -> str:
        parts: list[str] = []
        if self.quantidade_tipo:
            parts.append(f"QT:{self.quantidade_tipo.upper()}")
        if self.quantidade_unidade:
            parts.append(f"QU:{self.quantidade_unidade.upper()}")
        if self.quantidade_total is not None:
            parts.append(f"QV:{round(float(self.quantidade_total), 3)}")
        parts.append(f"SAL:{int(self.flag_com_sal)}-{int(self.flag_sem_sal)}")
        if self.marca_detectada:
            parts.append(f"BRAND:{self.marca_detectada}")
        return "|".join(parts)

    @property
    def blocking_key(self) -> tuple[str, str, str, str]:
        return (
            self.significant_token,
            self.familia_norm,
            self.subfamilia_norm,
            self.critical_signature,
        )


def _fetch_terms(batch_id: str) -> List[ArticleRecord]:
    conn = connect()
    cur = conn.execute(
        """
        SELECT
            wa.id,
            wa.nome_norm,
            COALESCE(wa.nome_sem_stop, ''),
            COALESCE(ir.familia, ''),
            COALESCE(ir.subfamilia, ''),
            wa.quantidade_total,
            wa.quantidade_unidade,
            wa.quantidade_tipo,
            wa.flag_com_sal,
            wa.flag_sem_sal,
            wa.marca_detectada
        FROM working_article wa
        LEFT JOIN imported_raw ir ON ir.id = wa.raw_id
        WHERE wa.batch_id=?
        """,
        (batch_id,),
    )
    records = [
        ArticleRecord(
            id=row[0],
            nome_norm=row[1] or "",
            nome_sem_stop=row[2] or "",
            familia=row[3] or "",
            subfamilia=row[4] or "",
            quantidade_total=row[5],
            quantidade_unidade=row[6],
            quantidade_tipo=row[7],
            flag_com_sal=bool(row[8]),
            flag_sem_sal=bool(row[9]),
            marca_detectada=row[10] or None,
        )
        for row in cur.fetchall()
    ]
    conn.close()
    return records


def propose_clusters(batch_id: str, t1: float = 0.85, t2: float = 0.92) -> Dict[str, Any]:
    init_db()
    records = _fetch_terms(batch_id)
    if not records:
        return {"ok": False, "error": "Sem artigos para clusterizar"}
    n = len(records)

    if n == 1:
        return {"ok": True, "batch_id": batch_id, "clusters_created": 0, "members": 0}

    graph: dict[int, dict[int, dict[str, float | bool]]] = defaultdict(dict)
    similarity_cache: dict[tuple[int, int], tuple[float, bool]] = {}

    blocks: dict[tuple[str, str, str, str], List[int]] = defaultdict(list)
    for idx, record in enumerate(records):
        blocks[record.blocking_key].append(idx)

    for block_indices in blocks.values():
        if len(block_indices) < 2:
            continue
        block_terms = [records[i].nome_norm for i in block_indices]
        vect = TfidfVectorizer(analyzer="char", ngram_range=(3, 3))
        X_block = vect.fit_transform(block_terms)
        nn = NearestNeighbors(metric="cosine", algorithm="brute")
        k = min(max(2, len(block_indices)), 50)
        nn.fit(X_block)
        _, local_indices = nn.kneighbors(X_block, n_neighbors=k)

        for i_local, idx_i in enumerate(block_indices):
            for j_local in local_indices[i_local]:
                idx_j = block_indices[j_local]
                if idx_i == idx_j:
                    continue
                key = (min(idx_i, idx_j), max(idx_i, idx_j))
                if key in similarity_cache:
                    score, strong = similarity_cache[key]
                else:
                    cos_val = float(cosine_similarity(X_block[i_local], X_block[j_local])[0, 0])
                    jw_val = float(
                        JaroWinkler.normalized_similarity(
                            block_terms[i_local], block_terms[j_local]
                        )
                    )
                    score = 0.6 * cos_val + 0.4 * jw_val
                    strong = score >= t2
                    similarity_cache[key] = (score, strong)
                if score >= t1:
                    graph[idx_i][idx_j] = {"score": score, "strong": strong}
                    graph[idx_j][idx_i] = {"score": score, "strong": strong}

    _remove_weak_bridges(graph, n)

    visited = [False] * n
    components: List[List[int]] = []
    for i in range(n):
        if visited[i]:
            continue
        queue: deque[int] = deque([i])
        visited[i] = True
        comp: List[int] = []
        while queue:
            current = queue.popleft()
            comp.append(current)
            for nbr in graph.get(current, {}):
                if not visited[nbr]:
                    visited[nbr] = True
                    queue.append(nbr)
        components.append(comp)

    conn = connect()
    created = 0
    members = 0
    with conn:
        for comp in components:
            if len(comp) == 1:
                continue
            label = _suggest_label(conn, records, comp)
            cur = conn.execute(
                "INSERT INTO cluster_proposal(batch_id, label_sugerido, created_at) VALUES(?,?,?)",
                (batch_id, label, now_utc()),
            )
            cluster_id = cur.lastrowid
            created += 1
            for idx in comp:
                if idx == comp[0]:
                    sc = 1.0
                else:
                    sc = _pair_similarity(similarity_cache, comp[0], idx, records, t2)
                selected = 1 if idx == comp[0] or sc >= t2 else 0
                conn.execute(
                    "INSERT INTO cluster_member(cluster_id, working_id, score, selected_by_user) VALUES(?,?,?,?)",
                    (cluster_id, records[idx].id, sc, selected),
                )
                members += 1
    return {"ok": True, "batch_id": batch_id, "clusters_created": created, "members": members}


def _remove_weak_bridges(
    graph: dict[int, dict[int, dict[str, float | bool]]], n: int
) -> None:
    time = 0
    visited = [False] * n
    tin = [-1] * n
    low = [-1] * n
    bridges: set[tuple[int, int]] = set()

    def dfs(v: int, parent: int) -> None:
        nonlocal time
        visited[v] = True
        tin[v] = low[v] = time
        time += 1
        for to, meta in list(graph.get(v, {}).items()):
            if to == parent:
                continue
            if visited[to]:
                low[v] = min(low[v], tin[to])
            else:
                dfs(to, v)
                low[v] = min(low[v], low[to])
                if low[to] > tin[v] and not meta.get("strong"):
                    bridges.add((min(v, to), max(v, to)))

    for vertex in range(n):
        if not visited[vertex]:
            dfs(vertex, -1)

    for a, b in bridges:
        graph[a].pop(b, None)
        graph[b].pop(a, None)


def _pair_similarity(
    cache: dict[tuple[int, int], tuple[float, bool]],
    i: int,
    j: int,
    records: List[ArticleRecord],
    strong_threshold: float,
) -> float:
    key = (min(i, j), max(i, j))
    if key not in cache:
        score = _combined_similarity_terms(records[i].nome_norm, records[j].nome_norm)
        cache[key] = (score, score >= strong_threshold)
    return cache[key][0]


def _combined_similarity_terms(term_a: str, term_b: str) -> float:
    vect = TfidfVectorizer(analyzer="char", ngram_range=(3, 3))
    matrix = vect.fit_transform([term_a, term_b])
    cos_val = float(cosine_similarity(matrix[0], matrix[1])[0, 0])
    jw_val = float(JaroWinkler.normalized_similarity(term_a, term_b))
    return 0.6 * cos_val + 0.4 * jw_val


def _suggest_label(conn, records: List[ArticleRecord], comp: List[int]) -> str:
    combos: dict[tuple[str, str], int] = defaultdict(int)
    for idx in comp:
        record = records[idx]
        key = ((record.familia or ""), (record.subfamilia or ""))
        combos[key] += 1

    sorted_combos = sorted(combos.items(), key=lambda item: item[1], reverse=True)
    for (familia, subfamilia), _ in sorted_combos:
        label = _label_from_class_map(conn, familia, subfamilia)
        if label:
            return label

    for (familia, subfamilia), _ in sorted_combos:
        label = label_from_rules(familia, subfamilia)
        if label:
            return label

    fallback = records[comp[0]].significant_token
    return f"{fallback or 'ITEM'} (m)"


def _label_from_class_map(conn, familia: str | None, subfamilia: str | None) -> str | None:
    fam = (familia or "").strip().upper()
    sub = (subfamilia or "").strip().upper()
    cur = conn.execute(
        """
        SELECT canonical_label
        FROM class_map
        WHERE scope=?
          AND UPPER(COALESCE(familia, ''))=?
          AND UPPER(COALESCE(subfamilia, ''))=?
        LIMIT 1
        """,
        ("global", fam, sub),
    )
    row = cur.fetchone()
    return row[0] if row else None
