# App Status — Source of Truth (SoT)
This document is **the single source of truth** for Codex and humans.
Every Codex runner **MUST** append a changelog entry.

## Index
- SoT index: `docs/en/codex/architecture/app-status-index.json`
- This file: `docs/en/codex/architecture/app-status2gpt.md`

## Project
- Name: sa-convert-data
- GUI: pywebview (direct, no HTTP server)
- OS: macOS (Apple Silicon compatible)

## Changelog
- 2025-10-24T00:17:25Z — Seed v2: SSH remote fixed, `.codex.env` added, start.sh & runners ready.

## Change @ 2025-10-24T00:36:04Z
- Runner: 001 — Branch setup (HTTPS)
- Changed: git remote (origin), branches (main/my-sa-convert-data)
- Summary: Configurado origin via HTTPS e criado/alinhado o branch pessoal.

## Change @ 2025-10-24T00:36:04Z
- Runner: 020 — Start environment runner
- Changed: start.sh (exec), .venv/*, requirements.txt (read)
- Summary: Criado/validado venv e instaladas dependências.

## Change @ 2025-10-24T00:57:09Z
- Runner: 100 — Scaffold da aplicação
- Changed: app/*, tools/*, rules/*, main.py
- Summary: Esqueleto pywebview direto + DB + modo aprendizagem + runners.

## Change @ 2025-10-24T00:57:09Z
- Runner: 110 — DB initialized
- Changed: databases/app/data.db (created), tools/init_db.py (exec)
- Summary: Schema criado/validado (memória de decisões).

## Change @ 2025-10-24T01:16:31Z
- Runner: phase3-5 — Importer/Clustering wiring
- Changed: app/backend/clustering.py, app/backend/exporter_excel.py, app/backend/importer_cardex.py, docs/en/codex/200_import_cardex_runner.md, docs/en/codex/210_clustering_runner.md, docs/en/codex/220_review_gui_runner.md, docs/en/codex/300_export_runner.md
- Summary: Sincronizado backend dos pipelines fase 3-5 com os manuais dos runners.

## Change @ 2025-10-24T01:34:24Z
- Runner: Docs — 095/200/300
- Changed: app/config.py, docs/en/codex/095_paths_bootstrap.md, docs/en/codex/200_import_cardex_runner.md, docs/en/codex/300_export_runner.md
- Summary: Atualizados caminhos padrão e instruções dos runners de bootstrap/importação/exportação.

## Change @ 2025-10-24T01:35:39Z
- Runner: 095/200/300 — Backend wiring
- Changed: app/backend/api.py, app/backend/clustering.py, app/backend/db.py, app/backend/exporter_excel.py, app/backend/importer_cardex.py, app/backend/learning_importer.py, app/backend/text_norm.py, tools/init_dirs.py
- Summary: Reestruturado backend para ligar importação, clustering e exportação com diretórios padrão.

## Change @ 2025-10-24T01:44:30Z
- Runner: 090/095/200/210/220/300
- Changed: docs/en/codex/090_orchestrator.md, docs/en/codex/210_clustering_runner.md, docs/en/codex/220_review_gui_runner.md, tools/auto_approve.py
- Summary: Documentado orquestrador e runners complementares, adicionando helper de auto-aprovação.

## Change @ 2025-10-24T01:55:19Z
- Runner: Merge PR #1 — my-sa-convert-data
- Changed: app/backend/*, app/frontend/*, docs/en/codex/*.md, docs/en/codex/architecture/app-status2gpt.md, docs/en/codex/architecture/app-status-index.json, main.py, rules/domain.yml, tools/*, data.sqlite
- Summary: Integração inicial do branch pessoal com app completo, documentação e scripts auxiliares.

## Change @ 2025-10-24T02:14:13Z
- Runner: Repo hygiene — DB assets
- Changed: .gitignore, app/backend/db.py, databases/app/README.md, databases/import/README.md, docs/en/codex/110_init_db_runner.md, docs/en/codex/architecture/app-status2gpt.md
- Summary: Parado rastreamento dos binários SQLite e documentado setup local das bases.

## Change @ 2025-10-24T02:14:27Z
- Runner: Merge PR #2 — DB setup docs
- Changed: .gitignore, app/backend/db.py, databases/app/README.md, databases/import/README.md, docs/en/codex/110_init_db_runner.md, docs/en/codex/architecture/app-status2gpt.md
- Summary: Consolidada a limpeza de binários SQLite e a documentação de inicialização.

## Change @ 2025-10-24T13:10:48Z
- Runner: Clustering workflow revamp
- Changed: app/backend/clustering.py, app/backend/importer_cardex.py, app/frontend/app.js, app/frontend/index.html, app/frontend/styles.css
- Summary: Refinado fluxo de clustering e UI com melhorias de interação e visual.

## Change @ 2025-10-24T13:11:05Z
- Runner: Merge PR #3 — Clustering feedback
- Changed: app/backend/clustering.py, app/backend/importer_cardex.py, app/frontend/app.js, app/frontend/index.html, app/frontend/styles.css
- Summary: Mesclado refinamento de clustering e ajustes de UX.

## Change @ 2025-10-24T14:33:30Z
- Runner: Docs — models overview
- Changed: databases/models/readme.md
- Summary: Criado README inicial explicando os artefatos de modelos.

## Change @ 2025-10-24T14:35:02Z
- Runner: Assets — modelos Excel
- Changed: databases/models/export template.xlsx, databases/models/import template.xlsx
- Summary: Adicionados templates de exportação/importação em Excel para modelos.

## Change @ 2025-10-24T14:45:18Z
- Runner: Assets — aprendizagem Excel
- Changed: databases/models/modelo aprendizagem.xlsx
- Summary: Incluído modelo de planilha para dados de aprendizagem.

## Change @ 2025-10-24T16:21:27Z
- Runner: 200 — Cardex schema normalization
- Changed: app/backend/cardex_schema.py, app/backend/db.py, app/backend/importer_cardex.py, docs/en/codex/200_import_cardex_runner.md
- Summary: Normalizado schema do importador Cardex com suporte estruturado.

## Change @ 2025-10-24T16:21:42Z
- Runner: Merge PR #4 — Cardex schema
- Changed: app/backend/cardex_schema.py, app/backend/db.py, app/backend/importer_cardex.py, docs/en/codex/200_import_cardex_runner.md
- Summary: Mesclada normalização do schema Cardex e documentação associada.

## Change @ 2025-10-24T16:40:35Z
- Runner: NLP — Article features
- Changed: app/backend/article_features.py, app/backend/cardex_schema.py, app/backend/db.py, app/backend/importer_cardex.py, tests/__init__.py, tests/test_article_features.py
- Summary: Extração e persistência de features de artigos com cobertura de testes.

## Change @ 2025-10-24T16:40:48Z
- Runner: Merge PR #5 — Article features
- Changed: app/backend/article_features.py, app/backend/cardex_schema.py, app/backend/db.py, app/backend/importer_cardex.py, tests/__init__.py, tests/test_article_features.py
- Summary: Mesclada funcionalidade de features de artigos e testes correlatos.

## Change @ 2025-10-24T16:47:27Z
- Runner: Clustering — Blocking & labels
- Changed: app/backend/clustering.py, app/backend/domain_rules.py, requirements.txt
- Summary: Adicionadas etapas de blocking e regras declarativas de rotulagem no clustering.

## Change @ 2025-10-24T16:47:39Z
- Runner: Merge PR #6 — Blocking pipeline
- Changed: app/backend/clustering.py, app/backend/domain_rules.py, requirements.txt
- Summary: Mescladas melhorias de blocking e scoring do clustering.

## Change @ 2025-10-24T17:05:27Z
- Runner: Knowledge reuse
- Changed: app/backend/api.py, app/backend/audit.py, app/backend/clustering.py, app/backend/domain_rules.py, app/backend/learning_importer.py, app/frontend/app.js, docs/en/codex/090_orchestrator.md, docs/en/codex/210_clustering_runner.md, tests/test_clustering_knowledge.py, tests/test_learning_importer.py
- Summary: Reaproveitamento da base de aprendizagem no clustering com auditoria e testes.

## Change @ 2025-10-24T17:05:41Z
- Runner: Merge PR #7 — Knowledge reuse
- Changed: app/backend/api.py, app/backend/audit.py, app/backend/clustering.py, app/backend/domain_rules.py, app/backend/learning_importer.py, app/frontend/app.js, docs/en/codex/090_orchestrator.md, docs/en/codex/210_clustering_runner.md, tests/test_clustering_knowledge.py, tests/test_learning_importer.py
- Summary: Mesclada reutilização de conhecimento com cobertura de testes e documentação.

## Change @ 2025-10-24T17:20:16Z
- Runner: Review UI & validation
- Changed: app/backend/api.py, app/frontend/app.js, app/frontend/styles.css, tests/test_api_clusters.py
- Summary: Validações reforçadas e UI de revisão de clusters aprimorada.

## Change @ 2025-10-24T17:20:31Z
- Runner: Merge PR #8 — Review UI
- Changed: app/backend/api.py, app/frontend/app.js, app/frontend/styles.css, tests/test_api_clusters.py
- Summary: Mesclado reforço de validações e UI de revisão de clusters.

## Change @ 2025-10-24T17:40:38Z
- Runner: Export — Logging coverage
- Changed: app/backend/exporter_excel.py, app/backend/importer_cardex.py, docs/en/codex/200_import_cardex_runner.md
- Summary: Cobertura do export Excel ampliada com logging adicional.

## Change @ 2025-10-24T17:40:53Z
- Runner: Merge PR #9 — Export logging
- Changed: app/backend/exporter_excel.py, app/backend/importer_cardex.py, docs/en/codex/200_import_cardex_runner.md
- Summary: Mescladas melhorias de exportação com telemetria.

## Change @ 2025-10-24T17:51:13Z
- Runner: Launcher bootstrap
- Changed: launcher
- Summary: Adicionado script para preparar ambiente e lançar a GUI automaticamente.

## Change @ 2025-10-24T17:51:25Z
- Runner: Merge PR #10 — Launcher
- Changed: launcher
- Summary: Mesclado script de bootstrap do ambiente e execução da GUI.

## Change @ 2025-10-24T18:17:49Z
- Runner: Native file picker
- Changed: app/backend/api.py, app/frontend/app.js, app/frontend/index.html, app/frontend/styles.css, main.py
- Summary: Inseridos pickers nativos para seleção de ficheiros e removido leitor SoT.

## Change @ 2025-10-24T18:18:02Z
- Runner: Merge PR #11 — File picker
- Changed: app/backend/api.py, app/frontend/app.js, app/frontend/index.html, app/frontend/styles.css, main.py
- Summary: Mesclada melhoria de seleção de ficheiros com ajustes no frontend/backend.

## Change @ 2025-10-24T18:32:58Z
- Runner: Forget learning per scope
- Changed: app/backend/api.py, app/backend/learning_importer.py, app/frontend/app.js, app/frontend/index.html, app/frontend/styles.css, tests/test_learning_importer.py
- Summary: Permite limpar dados de aprendizagem por escopo com suporte de UI e testes.

## Change @ 2025-10-24T18:33:13Z
- Runner: Merge PR #12 — Scoped forgetting
- Changed: app/backend/api.py, app/backend/learning_importer.py, app/frontend/app.js, app/frontend/index.html, app/frontend/styles.css, tests/test_learning_importer.py
- Summary: Mesclada funcionalidade de esquecimento segmentado.

## Change @ 2025-10-24T18:49:46Z
- Runner: Docs — README refresh
- Changed: README.md
- Summary: Atualizado README com documentação abrangente do projecto.

## Change @ 2025-10-24T18:50:44Z
- Runner: Docs — Roadmap
- Changed: docs/roadmap.md
- Summary: Adicionado roadmap detalhado com etapas planeadas.
