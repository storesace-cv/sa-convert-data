import traceback
from pathlib import Path
from typing import Any, Dict

import webview

from app.backend.audit import log_action
from app.backend.db import connect, init_db, now_utc
from app.backend.dashboard_metrics import (
    DashboardMetricsError,
    collect_dashboard_metrics,
    render_dashboard_report,
)
from app.backend.learning_importer import learn_from_xlsx, forget_learning as forget_learning_scope
from app.backend.importer_cardex import import_cardex_reformulado
from app.backend.clustering import propose_clusters
from app.backend.text_norm import normalize_name
from app.backend.domain_rules import prohibitions as load_prohibitions


class ExposedAPI:
    def __init__(self) -> None:
        self._window: webview.Window | None = None
        self._dashboard_html_cache: tuple[str, float] | None = None

    def attach_window(self, window: webview.Window) -> None:
        self._window = window

    # Dialogs
    def choose_file(self, options: Dict[str, Any] | None = None) -> Dict[str, Any]:
        if self._window is None:
            return {"ok": False, "error": "Janela não inicializada."}

        filters_raw = []
        if options:
            filters_raw = options.get("filters") or []

        file_types = []
        for item in filters_raw:
            if not isinstance(item, dict):
                continue
            description = item.get("description") or "Ficheiros"
            extensions = item.get("extensions") or []
            pattern: str | None = None
            if isinstance(extensions, str):
                pattern = extensions
            elif isinstance(extensions, list):
                parts: list[str] = [part for part in extensions if isinstance(part, str) and part]
                if parts:
                    pattern = ";".join(parts)
            if not pattern:
                pattern = "*"
            file_types.append((description, pattern))

        try:
            result = self._window.create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=file_types or None,
            )
        except Exception as exc:  # pragma: no cover - GUI interaction
            return {"ok": False, "error": str(exc)}

        if not result:
            return {"ok": True, "canceled": True, "path": None}

        return {"ok": True, "canceled": False, "path": result[0]}

    # Learning
    def learning_import(self, xlsx_path: str, scope: str = "global") -> Dict[str, Any]:
        try:
            init_db()
            result = learn_from_xlsx(xlsx_path, scope)
            return result
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc()}

    def forget_learning(self, scope: str = "global") -> Dict[str, Any]:
        try:
            init_db()
            return forget_learning_scope(scope)
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc()}

    # Import cardex
    def import_cardex(self, xlsx_path: str, batch_id: str) -> Dict[str, Any]:
        try:
            return import_cardex_reformulado(xlsx_path, batch_id)
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Clustering
    def run_clustering(
        self,
        batch_id: str,
        scope: str = "global",
        t1: float = 0.85,
        t2: float = 0.92,
    ) -> Dict[str, Any]:
        try:
            return propose_clusters(batch_id, scope, t1, t2)
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Review list
    def list_clusters(self, batch_id: str, scope: str = "global") -> Dict[str, Any]:
        try:
            conn = connect()
            try:
                cur = conn.execute(
                    "SELECT id, label_sugerido FROM cluster_proposal WHERE batch_id=?",
                    (batch_id,),
                )
                items: list[dict[str, Any]] = []
                prohibition_rules = [list(rule) for rule in load_prohibitions(scope or "global")]

                for cid, lbl in cur.fetchall():
                    rows = conn.execute(
                        """
                        SELECT
                            cm.working_id,
                            cm.score,
                            cm.selected_by_user,
                            ir.nome,
                            wa.quantidade_valor,
                            wa.quantidade_total,
                            wa.quantidade_unidade,
                            wa.quantidade_tipo,
                            wa.quantidade_numero,
                            wa.flag_com_sal,
                            wa.flag_sem_sal,
                            wa.marca_detectada,
                            COALESCE(wa.nome_sem_stop, wa.nome_norm, ''),
                            ir.unid_default,
                            ir.unid_compra,
                            ir.unid_stock,
                            ir.unid_log
                        FROM cluster_member cm
                        JOIN working_article wa ON wa.id=cm.working_id
                        JOIN imported_raw ir ON ir.id=wa.raw_id
                        WHERE cm.cluster_id=?
                        """,
                        (cid,),
                    ).fetchall()

                    members: list[dict[str, Any]] = []
                    for row in rows:
                        wid = row[0]
                        score = float(row[1] or 0.0)
                        selected = bool(row[2])
                        nome = row[3]
                        quantidade = {
                            "valor": row[4],
                            "total": row[5],
                            "unidade": row[6],
                            "tipo": row[7],
                            "numero": row[8],
                        }
                        flag_com_sal = bool(row[9])
                        flag_sem_sal = bool(row[10])
                        marca = row[11] or None
                        nome_tokens = (row[12] or "").strip().upper()
                        tokens_set: set[str] = set()
                        if flag_com_sal:
                            tokens_set.add("COM SAL")
                        if flag_sem_sal:
                            tokens_set.add("SEM SAL")
                        if marca:
                            tokens_set.add(str(marca).strip().upper())
                        if nome_tokens:
                            tokens_set.add(nome_tokens)
                            tokens_set.update(tok for tok in nome_tokens.split() if tok)

                        member_data = {
                            "id": wid,
                            "score": score,
                            "selected": selected,
                            "nome": nome,
                            "quantidade": quantidade,
                            "flags": [
                                label
                                for label, present in (
                                    ("COM SAL", flag_com_sal),
                                    ("SEM SAL", flag_sem_sal),
                                )
                                if present
                            ],
                            "marca": marca,
                            "blocking_tokens": sorted(tokens_set),
                            "units": {
                                "unit_default": row[13] or None,
                                "unit_compra": row[14] or None,
                                "unit_stock": row[15] or None,
                                "unit_log": row[16] or None,
                            },
                        }
                        members.append(member_data)

                    unit_keys = ("unit_default", "unit_compra", "unit_stock", "unit_log")
                    unit_options: dict[str, list[str]] = {}
                    suggested_units: dict[str, str | None] = {}

                    if members:
                        sorted_members = sorted(
                            members,
                            key=lambda m: (not m["selected"], -m["score"]),
                        )
                        for key in unit_keys:
                            seen: set[str] = set()
                            for member in members:
                                value = member["units"].get(key)
                                if value and value not in seen:
                                    seen.add(value)
                            unit_options[key] = sorted(seen)

                            suggestion = None
                            for candidate in sorted_members:
                                value = candidate["units"].get(key)
                                if value:
                                    suggestion = value
                                    break
                            suggested_units[key] = suggestion

                    items.append(
                        {
                            "id": cid,
                            "label": lbl,
                            "members": members,
                            "unit_options": unit_options,
                            "suggested_units": suggested_units,
                        }
                    )

                return {
                    "ok": True,
                    "items": items,
                    "prohibitions": prohibition_rules,
                }
            finally:
                conn.close()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Toggle member
    def select_member(self, cluster_id: int, working_id: int, selected: bool) -> Dict[str, Any]:
        try:
            conn = connect()
            with conn:
                conn.execute("UPDATE cluster_member SET selected_by_user=? WHERE cluster_id=? AND working_id=?", (1 if selected else 0, cluster_id, working_id))
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Approve cluster
    def approve_cluster(
        self,
        cluster_id: int,
        scope: str = "global",
        units: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        conn = connect()
        try:
            selected_rows = conn.execute(
                """
                SELECT
                    wa.flag_com_sal,
                    wa.flag_sem_sal,
                    wa.marca_detectada,
                    COALESCE(wa.nome_sem_stop, wa.nome_norm, '')
                FROM cluster_member cm
                JOIN working_article wa ON wa.id=cm.working_id
                WHERE cm.cluster_id=? AND cm.selected_by_user=1
                """,
                (cluster_id,),
            ).fetchall()

            if not selected_rows:
                return {"ok": False, "error": "Sem membros selecionados"}

            active_tokens: set[str] = set()
            for flag_com, flag_sem, marca, nome_norm in selected_rows:
                if flag_com:
                    active_tokens.add("COM SAL")
                if flag_sem:
                    active_tokens.add("SEM SAL")
                if marca:
                    active_tokens.add(str(marca).strip().upper())
                norm_text = (nome_norm or "").strip().upper()
                if norm_text:
                    active_tokens.add(norm_text)
                    active_tokens.update(tok for tok in norm_text.split() if tok)

            violations: list[list[str]] = []
            for rule in load_prohibitions(scope or "global"):
                if all(token in active_tokens for token in rule):
                    violations.append(list(rule))

            if violations:
                readable = ", ".join(" + ".join(rule) for rule in violations)
                return {
                    "ok": False,
                    "error": f"Regras de bloqueio violadas: {readable}",
                }

            row = conn.execute(
                """
                SELECT ir.id, ir.unid_default, ir.unid_compra, ir.unid_stock, ir.unid_log, ir.nome
                FROM cluster_member cm
                JOIN working_article wa ON wa.id=cm.working_id
                JOIN imported_raw ir ON ir.id=wa.raw_id
                WHERE cm.cluster_id=? AND cm.selected_by_user=1
                ORDER BY cm.score DESC LIMIT 1
                """,
                (cluster_id,),
            ).fetchone()
            if not row:
                return {"ok": False, "error": "Sem membros selecionados"}

            raw_id, ud, uc, us, ul, nome = row
            term_norm = normalize_name(nome)
            lookup_scopes = [scope] if scope == "global" else [scope, "global"]

            canonical_id: int | None = None
            canonical_label: str | None = None
            for sc in lookup_scopes:
                cur = conn.execute(
                    "SELECT canonical_id FROM canonical_synonym WHERE scope=? AND term_norm=? LIMIT 1",
                    (sc, term_norm),
                )
                match = cur.fetchone()
                if match and match[0] is not None:
                    canonical_id = match[0]
                    break

            pattern_units: Dict[str, str | None] = {}
            base_hint: str | None = None
            for sc in lookup_scopes:
                cur = conn.execute(
                    """
                    SELECT canonical_id, unit_default, unit_compra, unit_stock, unit_log, base_article_hint
                    FROM group_pattern
                    WHERE scope=? AND fingerprint=?
                    LIMIT 1
                    """,
                    (sc, term_norm),
                )
                match = cur.fetchone()
                if match:
                    gp_canon, gp_ud, gp_uc, gp_us, gp_ul, gp_hint = match
                    pattern_units = {
                        "unit_default": gp_ud,
                        "unit_compra": gp_uc,
                        "unit_stock": gp_us,
                        "unit_log": gp_ul,
                    }
                    base_hint = gp_hint
                    if canonical_id is None and gp_canon is not None:
                        canonical_id = gp_canon
                    break

            if canonical_id is not None:
                cur = conn.execute(
                    "SELECT name_canonico FROM canonical_item WHERE id=?",
                    (canonical_id,),
                )
                row_label = cur.fetchone()
                if row_label:
                    canonical_label = row_label[0]

            normalized_units = {
                key: (units or {}).get(key)
                for key in ("unit_default", "unit_compra", "unit_stock", "unit_log")
            }

            with conn:
                if canonical_id is None:
                    canonical_label = canonical_label or f"{nome} (m)"
                    cur = conn.execute(
                        """
                        INSERT INTO canonical_item(name_canonico, scope, rule_version, created_at)
                        VALUES(?,?,?,?)
                        """,
                        (canonical_label, scope, "v1", now_utc()),
                    )
                    canonical_id = cur.lastrowid
                else:
                    canonical_label = canonical_label or f"{nome} (m)"

                final_ud = normalized_units.get("unit_default") or ud or pattern_units.get("unit_default")
                final_uc = normalized_units.get("unit_compra") or uc or pattern_units.get("unit_compra")
                final_us = normalized_units.get("unit_stock") or us or pattern_units.get("unit_stock")
                final_ul = normalized_units.get("unit_log") or ul or pattern_units.get("unit_log")

                conn.execute(
                    """
                    INSERT INTO approval_decision(
                        cluster_id, canonical_id, artigo_base_raw_id,
                        unit_default, unit_compra, unit_stock, unit_log, decided_at
                    ) VALUES(?,?,?,?,?,?,?,?)
                    """,
                    (
                        cluster_id,
                        canonical_id,
                        raw_id,
                        final_ud,
                        final_uc,
                        final_us,
                        final_ul,
                        now_utc(),
                    ),
                )

                log_action(
                    conn,
                    scope,
                    "cluster_approved",
                    {
                        "cluster_id": cluster_id,
                        "canonical_id": canonical_id,
                        "canonical_label": canonical_label,
                        "term_norm": term_norm,
                        "base_hint": base_hint,
                        "units": {
                            "unit_default": final_ud,
                            "unit_compra": final_uc,
                            "unit_stock": final_us,
                            "unit_log": final_ul,
                        },
                    },
                )

            return {
                "ok": True,
                "cluster_id": cluster_id,
                "canonical_id": canonical_id,
                "canonical_label": canonical_label,
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}
        finally:
            conn.close()

    def set_cluster_selection(self, cluster_id: int, selected: bool) -> Dict[str, Any]:
        try:
            conn = connect()
            with conn:
                conn.execute(
                    "UPDATE cluster_member SET selected_by_user=? WHERE cluster_id=?",
                    (1 if selected else 0, cluster_id),
                )
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def split_cluster(self, cluster_id: int, member_ids: list[int]) -> Dict[str, Any]:
        try:
            if not member_ids:
                return {"ok": False, "error": "Seleciona ao menos um membro para dividir"}

            conn = connect()
            try:
                cluster_row = conn.execute(
                    "SELECT batch_id, label_sugerido FROM cluster_proposal WHERE id=?",
                    (cluster_id,),
                ).fetchone()
                if not cluster_row:
                    return {"ok": False, "error": "Cluster inexistente"}

                batch_id, label = cluster_row
                rows = conn.execute(
                    "SELECT working_id FROM cluster_member WHERE cluster_id=?",
                    (cluster_id,),
                ).fetchall()
                all_ids = {row[0] for row in rows}
                move_ids = {mid for mid in member_ids if mid in all_ids}
                if not move_ids:
                    return {"ok": False, "error": "IDs selecionados inválidos"}
                if len(move_ids) == len(all_ids):
                    return {"ok": False, "error": "Não é possível dividir com todos os membros"}

                placeholders = ",".join("?" for _ in move_ids)
                with conn:
                    cur = conn.execute(
                        """
                        INSERT INTO cluster_proposal(batch_id, label_sugerido, created_at)
                        VALUES(?,?,?)
                        """,
                        (batch_id, f"{label} (dividido)", now_utc()),
                    )
                    new_id = cur.lastrowid
                    conn.execute(
                        f"UPDATE cluster_member SET cluster_id=? WHERE cluster_id=? AND working_id IN ({placeholders})",
                        (new_id, cluster_id, *move_ids),
                    )

                return {
                    "ok": True,
                    "new_cluster_id": new_id,
                    "moved": len(move_ids),
                }
            finally:
                conn.close()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # Dashboard
    def get_dashboard_metrics(self, scope: str = "global") -> Dict[str, Any]:
        try:
            return {
                "ok": True,
                "data": collect_dashboard_metrics(scope or "global"),
            }
        except DashboardMetricsError as exc:
            return {"ok": False, "error": str(exc)}
        except Exception as exc:  # pragma: no cover - defensive guard
            return {"ok": False, "error": str(exc)}

    def generate_dashboard_report(self, scope: str = "global") -> Dict[str, Any]:
        try:
            result = render_dashboard_report(scope or "global")
            result["ok"] = True
            return result
        except DashboardMetricsError as exc:
            return {"ok": False, "error": str(exc)}
        except Exception as exc:  # pragma: no cover - defensive guard
            return {"ok": False, "error": str(exc)}

    def get_dashboard_template(self) -> Dict[str, Any]:
        try:
            project_root = Path(__file__).resolve().parents[2]
            template_path = project_root / "gui" / "learning_dashboard.html"

            if not template_path.is_file():
                return {
                    "ok": False,
                    "error": f"Dashboard template não encontrado em {template_path}",
                }

            stat = template_path.stat()
            cached = self._dashboard_html_cache
            if cached and cached[1] == stat.st_mtime:
                return {"ok": True, "html": cached[0]}

            html = template_path.read_text(encoding="utf-8")
            self._dashboard_html_cache = (html, stat.st_mtime)
            return {"ok": True, "html": html}
        except Exception as exc:  # pragma: no cover - defensive guard
            return {"ok": False, "error": str(exc)}
