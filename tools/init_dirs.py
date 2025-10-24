from app.config import ensure_dirs, DB_DIR, IMPORT_DIR, EXPORT_DIR
if __name__ == "__main__":
    ensure_dirs()
    print("OK: ensured directories")
    print(f"- DB_DIR     = {DB_DIR}")
    print(f"- IMPORT_DIR = {IMPORT_DIR}")
    print(f"- EXPORT_DIR = {EXPORT_DIR}")
