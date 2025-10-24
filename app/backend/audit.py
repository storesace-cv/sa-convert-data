from __future__ import annotations

import json
import os
import getpass
from typing import Any

from app.backend.db import now_utc


def current_user() -> str:
    """Return the best-effort identifier for the current operator."""

    for env_key in ("SA_CONVERT_USER", "USER"):
        value = os.getenv(env_key)
        if value:
            return value
    try:
        return getpass.getuser()
    except Exception:
        return "unknown"


def log_action(
    conn,
    scope: str,
    action: str,
    payload: dict[str, Any] | None,
    *,
    ts: str | None = None,
) -> int:
    """Persist an action in ``decision_log`` for auditing purposes."""

    payload_json = json.dumps(payload or {}, ensure_ascii=False, sort_keys=True)
    stamp = ts or now_utc()
    cur = conn.execute(
        """
        INSERT INTO decision_log(scope, action, payload_json, ts)
        VALUES(?,?,?,?)
        """,
        (scope, action, payload_json, stamp),
    )
    return cur.lastrowid

