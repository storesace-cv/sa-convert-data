# Base de dados da aplicação

Este diretório aloja os artefatos necessários para a base de dados SQLite usada pelo orquestrador.

O ficheiro `schema.sql` contém o schema completo e pode ser aplicado diretamente com `sqlite3`:

```bash
sqlite3 databases/app/data.db < databases/app/schema.sql
```

Também podes gerar/atualizar um ficheiro local (`data.db` por omissão) via runner Python:

```bash
python -m tools.init_db
```

> ⚠️ Os ficheiros `.db` são ignorados pelo Git. Mantém-nos apenas no teu ambiente local.
