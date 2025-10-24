from collections import defaultdict, deque
from functools import lru_cache
from typing import Any, Dict, List

from rapidfuzz.distance import JaroWinkler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors

from app.backend.db import connect, init_db, now_utc

def _fetch_terms(batch_id: str):
    conn = connect()
    cur = conn.execute("SELECT id, nome_norm FROM working_article WHERE batch_id=?", (batch_id,))
    rows = cur.fetchall()
    ids = [r[0] for r in rows]
    terms = [r[1] for r in rows]
    return ids, terms

def propose_clusters(batch_id: str, t1: float = 0.85, t2: float = 0.92) -> Dict[str, Any]:
    init_db()
    ids, terms = _fetch_terms(batch_id)
    if not ids:
        return {"ok": False, "error": "Sem artigos para clusterizar"}
    # TF-IDF 3-grams
    vect = TfidfVectorizer(analyzer="char", ngram_range=(3, 3))
    X = vect.fit_transform(terms)
    n = len(ids)

    if n == 1:
        return {"ok": True, "batch_id": batch_id, "clusters_created": 0, "members": 0}

    nn = NearestNeighbors(metric="cosine", algorithm="brute")
    k = min(max(2, n), 50)
    nn.fit(X)
    _, indices = nn.kneighbors(X, n_neighbors=k)

    graph: dict[int, set[int]] = defaultdict(set)

    @lru_cache(maxsize=None)
    def combined_similarity(i: int, j: int) -> float:
        if i == j:
            return 1.0
        cos_val = float(cosine_similarity(X[i], X[j])[0, 0])
        jw_val = float(JaroWinkler.normalized_similarity(terms[i], terms[j]))
        return 0.6 * cos_val + 0.4 * jw_val

    for i in range(n):
        for j in indices[i]:
            if i == j:
                continue
            score = combined_similarity(i, j)
            if score >= t1:
                graph[i].add(j)
                graph[j].add(i)

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
            for nbr in graph.get(current, []):
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
            head = terms[comp[0]].split(' ')[0]
            label = f"{head} (m)"
            cur = conn.execute("INSERT INTO cluster_proposal(batch_id, label_sugerido, created_at) VALUES(?,?,?)", (batch_id, label, now_utc()))
            cluster_id = cur.lastrowid
            created += 1
            for idx in comp:
                sc = float(combined_similarity(comp[0], idx))
                selected = 1 if idx == comp[0] or sc >= t2 else 0
                conn.execute(
                    "INSERT INTO cluster_member(cluster_id, working_id, score, selected_by_user) VALUES(?,?,?,?)",
                    (cluster_id, ids[idx], sc, selected),
                )
                members += 1
    return {"ok": True, "batch_id": batch_id, "clusters_created": created, "members": members}
