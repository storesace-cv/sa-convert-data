import os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DB_DIR      = Path(os.getenv("SA_CONVERT_DB_DIR", ROOT / "databases" / "app"))
IMPORT_DIR  = Path(os.getenv("SA_CONVERT_IMPORT_DIR", ROOT / "databases" / "import"))
EXPORT_DIR  = Path(os.getenv("SA_CONVERT_EXPORT_DIR", ROOT / "databases" / "export"))
def ensure_dirs():
    for p in (DB_DIR, IMPORT_DIR, EXPORT_DIR):
        p.mkdir(parents=True, exist_ok=True)
