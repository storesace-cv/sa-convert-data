from typing import Dict, Any, List
from app.backend.db import connect, init_db, now_utc
from rapidfuzz.distance import JaroWinkler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

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
    vect = TfidfVectorizer(analyzer='char', ngram_range=(3,3))
    X = vect.fit_transform(terms)
    cos = cosine_similarity(X)
    n = len(ids)
    # Build graph combining cosine + Jaro-Winkler
    jw = np.zeros((n,n))
    for i in range(n):
        for j in range(i+1, n):
            s = JaroWinkler.normalized_similarity(terms[i], terms[j])
            jw[i,j] = jw[j,i] = s

    score = 0.6 * cos + 0.4 * jw
    visited = [False]*n
    components: List[List[int]] = []
    for i in range(n):
        if visited[i]: continue
        stack=[i]; comp=[]
        visited[i]=True
        while stack:
            k=stack.pop()
            comp.append(k)
            nbrs = [m for m in range(n) if not visited[m] and score[k,m] >= t1 and m!=k]
            for m in nbrs:
                visited[m]=True
                stack.append(m)
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
                sc = float(score[comp[0], idx])
                conn.execute("INSERT INTO cluster_member(cluster_id, working_id, score, selected_by_user) VALUES(?,?,?,?)",
                             (cluster_id, ids[idx], sc, 1))
                members += 1
    return {"ok": True, "batch_id": batch_id, "clusters_created": created, "members": members}
