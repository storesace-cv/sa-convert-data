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
    unit_default TEXT,
    unit_compra TEXT,
    unit_stock TEXT,
    unit_log TEXT,
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
CREATE TABLE IF NOT EXISTS imported_raw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    cod_artigo TEXT,
    cod_barras TEXT,
    nome TEXT,
    nome_norm TEXT,
    desc1 TEXT,
    desc2 TEXT,
    desc_curta1 TEXT,
    desc_curta2 TEXT,
    categoria TEXT,
    familia TEXT,
    subfamilia TEXT,
    class_compra TEXT,
    class_venda TEXT,
    class_compra_venda TEXT,
    class_generico TEXT,
    class_producao TEXT,
    class_producao_venda TEXT,
    unid_default TEXT,
    unid_compra TEXT,
    unid_stock TEXT,
    unid_log TEXT,
    contribui_generico_codigo TEXT,
    fornecedor TEXT,
    fornecedor_identificador TEXT,
    fornecedor_cod_artigo TEXT,
    fornecedor_cod_barras TEXT,
    fornecedor_descricao TEXT,
    preco_compra_fornecedor TEXT,
    desconto_fornecedor TEXT,
    pvp1_s_com_iva TEXT,
    pvp2_r_com_iva TEXT,
    pvp3_er_com_iva TEXT,
    pvp4_bp2_com_iva TEXT,
    preco5_com_iva TEXT,
    tipo_iva TEXT,
    tabela_precos TEXT,
    estado TEXT,
    menu_online TEXT,
    tipo_artigo_online TEXT,
    ordem_tipo_artigo_online TEXT,
    classe_ordenacao1 TEXT,
    ordem_classe_ordenacao1 TEXT,
    ordem_classe_ordenacao2 TEXT,
    classe_ordenacao2 TEXT,
    nome_sem_stop TEXT,
    quantidade_valor REAL,
    quantidade_total REAL,
    quantidade_unidade TEXT,
    quantidade_tipo TEXT,
    quantidade_numero REAL,
    flag_com_sal INTEGER,
    flag_sem_sal INTEGER,
    marca_detectada TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS working_article (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    raw_id INTEGER NOT NULL,
    nome_norm TEXT NOT NULL,
    nome_sem_stop TEXT,
    quantidade_valor REAL,
    quantidade_total REAL,
    quantidade_unidade TEXT,
    quantidade_tipo TEXT,
    quantidade_numero REAL,
    flag_com_sal INTEGER,
    flag_sem_sal INTEGER,
    marca_detectada TEXT,
    FOREIGN KEY (raw_id) REFERENCES imported_raw(id)
);
CREATE TABLE IF NOT EXISTS cluster_proposal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    label_sugerido TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cluster_member (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id INTEGER NOT NULL,
    working_id INTEGER NOT NULL,
    score REAL,
    selected_by_user INTEGER DEFAULT 1,
    FOREIGN KEY (cluster_id) REFERENCES cluster_proposal(id),
    FOREIGN KEY (working_id) REFERENCES working_article(id)
);
CREATE TABLE IF NOT EXISTS approval_decision (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id INTEGER NOT NULL,
    canonical_id INTEGER,
    artigo_base_raw_id INTEGER,
    unit_default TEXT,
    unit_compra TEXT,
    unit_stock TEXT,
    unit_log TEXT,
    decided_at TEXT NOT NULL,
    FOREIGN KEY (cluster_id) REFERENCES cluster_proposal(id),
    FOREIGN KEY (canonical_id) REFERENCES canonical_item(id),
    FOREIGN KEY (artigo_base_raw_id) REFERENCES imported_raw(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pair_judgement_scope_terms
    ON pair_judgement(scope, left_term_norm, right_term_norm, label);

