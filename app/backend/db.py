import os, sqlite3, datetime

DB_PATH = os.environ.get("SA_CONVERT_DB", os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "data.sqlite"))

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS canonical_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_canonico TEXT NOT NULL,
  scope TEXT DEFAULT 'global',
  rule_version TEXT DEFAULT 'v1',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS canonical_synonym (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT DEFAULT 'global',
  term_norm TEXT NOT NULL,
  canonical_id INTEGER NOT NULL,
  confidence REAL DEFAULT 1.0,
  source TEXT DEFAULT 'learning_file',
  UNIQUE(scope, term_norm),
  FOREIGN KEY (canonical_id) REFERENCES canonical_item(id)
);

CREATE TABLE IF NOT EXISTS pair_judgement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT DEFAULT 'global',
  left_term_norm TEXT NOT NULL,
  right_term_norm TEXT NOT NULL,
  label TEXT NOT NULL,
  support_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS group_pattern (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT DEFAULT 'global',
  fingerprint TEXT NOT NULL,
  canonical_id INTEGER,
  unit_default TEXT, unit_compra TEXT, unit_stock TEXT, unit_log TEXT,
  base_article_hint TEXT,
  support_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'learning_file',
  UNIQUE(scope, fingerprint),
  FOREIGN KEY (canonical_id) REFERENCES canonical_item(id)
);

CREATE TABLE IF NOT EXISTS decision_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT DEFAULT 'global',
  action TEXT NOT NULL,
  payload_json TEXT,
  ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT DEFAULT 'global',
  familia TEXT,
  subfamilia TEXT,
  canonical_label TEXT,
  support_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'learning_file',
  UNIQUE(scope, familia, subfamilia)
);
"""

def connect():
  os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
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
