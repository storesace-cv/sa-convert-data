import os, sqlite3, datetime
from app.config import DB_DIR, ensure_dirs
ensure_dirs()
DB_PATH = os.environ.get("SA_CONVERT_DB", str(DB_DIR / "data.sqlite"))
SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS canonical_item (id INTEGER PRIMARY KEY AUTOINCREMENT, name_canonico TEXT NOT NULL, scope TEXT DEFAULT 'global', rule_version TEXT DEFAULT 'v1', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS canonical_synonym (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT DEFAULT 'global', term_norm TEXT NOT NULL, canonical_id INTEGER NOT NULL, confidence REAL DEFAULT 1.0, source TEXT DEFAULT 'learning_file', UNIQUE(scope, term_norm), FOREIGN KEY (canonical_id) REFERENCES canonical_item(id));
CREATE TABLE IF NOT EXISTS pair_judgement (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT DEFAULT 'global', left_term_norm TEXT NOT NULL, right_term_norm TEXT NOT NULL, label TEXT NOT NULL, support_count INTEGER DEFAULT 1, source TEXT DEFAULT 'user');
CREATE TABLE IF NOT EXISTS group_pattern (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT DEFAULT 'global', fingerprint TEXT NOT NULL, canonical_id INTEGER, unit_default TEXT, unit_compra TEXT, unit_stock TEXT, unit_log TEXT, base_article_hint TEXT, support_count INTEGER DEFAULT 1, source TEXT DEFAULT 'learning_file', UNIQUE(scope, fingerprint), FOREIGN KEY (canonical_id) REFERENCES canonical_item(id));
CREATE TABLE IF NOT EXISTS decision_log (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT DEFAULT 'global', action TEXT NOT NULL, payload_json TEXT, ts TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS class_map (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT DEFAULT 'global', familia TEXT, subfamilia TEXT, canonical_label TEXT, support_count INTEGER DEFAULT 1, source TEXT DEFAULT 'learning_file', UNIQUE(scope, familia, subfamilia));
CREATE TABLE IF NOT EXISTS imported_raw (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL, row_index INTEGER NOT NULL, nome TEXT, nome_norm TEXT, desc1 TEXT, desc2 TEXT, unid_default TEXT, unid_compra TEXT, unid_stock TEXT, unid_log TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS working_article (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL, raw_id INTEGER NOT NULL, nome_norm TEXT NOT NULL, FOREIGN KEY (raw_id) REFERENCES imported_raw(id));
CREATE TABLE IF NOT EXISTS cluster_proposal (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL, label_sugerido TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cluster_member (id INTEGER PRIMARY KEY AUTOINCREMENT, cluster_id INTEGER NOT NULL, working_id INTEGER NOT NULL, score REAL, selected_by_user INTEGER DEFAULT 1, FOREIGN KEY (cluster_id) REFERENCES cluster_proposal(id), FOREIGN KEY (working_id) REFERENCES working_article(id));
CREATE TABLE IF NOT EXISTS approval_decision (id INTEGER PRIMARY KEY AUTOINCREMENT, cluster_id INTEGER NOT NULL, canonical_id INTEGER, artigo_base_raw_id INTEGER, unit_default TEXT, unit_compra TEXT, unit_stock TEXT, unit_log TEXT, decided_at TEXT NOT NULL, FOREIGN KEY (cluster_id) REFERENCES cluster_proposal(id), FOREIGN KEY (canonical_id) REFERENCES canonical_item(id), FOREIGN KEY (artigo_base_raw_id) REFERENCES imported_raw(id));
"""
def connect():
  ensure_dirs()
  conn = sqlite3.connect(DB_PATH)
  conn.execute("PRAGMA foreign_keys=ON;")
  return conn
def init_db():
  conn = connect()
  with conn:
    conn.executescript(SCHEMA_SQL)
  conn.close()
def now_utc():
  return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
