# StoresAce - Gestão de Artigos & Ingredientes

Sistema profissional de gestão, normalização e classificação de artigos para restauração.

## 🎯 Características Principais

- **Importação Excel**: Upload de ficheiros XLSX com mapeamento de colunas
- **Normalização Automática**: Conversão para MAIÚSCULAS, remoção de acentos, validações
- **Classificação Inteligente**: Regras de negócio (família/subfamília, COMPRA vs COMPRA/VENDA)
- **Detecção de Duplicados**: Fuzzy matching ≥85% com merge inteligente
- **Exportação Multi-formato**: Excel, CSV, JSONL
- **Offline-First**: PWA com IndexedDB e service worker
- **Atalhos macOS**: ⌘I, ⌘S, ⌘E, ⌘F, ⌘K, ⌘Z
- **Audit Trail**: Registo completo de todas as operações

## 🚀 Início Rápido

```bash
npm install
npm run dev
```

## 📱 PWA Installation

1. Abrir no Safari/Chrome (macOS)
2. Clicar no ícone de partilha
3. Selecionar "Adicionar ao ecrã inicial"
4. App funciona offline com sincronização automática

## 🖥️ Desktop macOS

Ver [DESKTOP_WRAPPER_GUIDE.md](./DESKTOP_WRAPPER_GUIDE.md) para instruções de empacotamento com Electron/Tauri.

## 📊 Módulos

1. **Dashboard**: Métricas em tempo real
2. **Importar**: Upload e preview de ficheiros
3. **Classificar**: Aplicação de regras de negócio
4. **Duplicados**: Detecção e fusão
5. **Exportar**: Download em múltiplos formatos
6. **Métricas**: Análise e audit trail

## 🔑 Atalhos de Teclado

- `⌘I` - Importar
- `⌘S` - Guardar
- `⌘E` - Exportar
- `⌘F` - Pesquisar
- `⌘K` - Command Palette
- `⌘Z` - Desfazer
- `⇧⌘Z` - Refazer

## 🌍 Idiomas Suportados

- Português (Portugal) - pt-PT
- Português (Angola) - pt-AO
- Português (Cabo Verde) - pt-CV

## 🔒 Segurança

- Dados armazenados localmente (IndexedDB)
- HTTPS obrigatório em produção
- Audit trail completo
- RBAC (operacional, gestor, admin)

## 📄 Licença

Proprietary - BWB & Zone Soft
