from __future__ import annotations

import json
from typing import Any

from app.backend.db import now_utc


def log_action(conn, scope: str, action: str, payload: dict[str, Any] | None) -> None:
    """Persist an action in ``decision_log`` for auditing purposes."""

    payload_json = json.dumps(payload or {}, ensure_ascii=False, sort_keys=True)
    conn.execute(
        """
        INSERT INTO decision_log(scope, action, payload_json, ts)
        VALUES(?,?,?,?)
        """,
        (scope, action, payload_json, now_utc()),
    )

