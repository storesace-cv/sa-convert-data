import json, traceback
from typing import Any, Dict
from app.backend.db import init_db
from app.backend.learning_importer import learn_from_xlsx

SOT_INDEX = "docs/en/codex/architecture/app-status-index.json"
SOT_TEXT = "docs/en/codex/architecture/app-status2gpt.md"

class ExposedAPI:
    def read_sot(self) -> Dict[str, Any]:
        try:
            with open(SOT_INDEX, "r") as f:
                idx = json.load(f)
            with open(SOT_TEXT, "r") as f:
                txt = f.read()
            return {"index": idx, "text_len": len(txt), "text_preview": txt[:4000]}
        except Exception as e:
            return {"error": str(e)}

    def learning_import(self, xlsx_path: str, scope: str = "global") -> Dict[str, Any]:
        try:
            init_db()
            result = learn_from_xlsx(xlsx_path, scope)
            return result
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc()}
