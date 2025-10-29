# StoresAce Application Deep-Dive

- **Repository:** sa-convert-data
- **Default branch:** main
- **Revision:** 71ab33a
- **Generated:** 2025-10-29T10:28:20Z (UTC)
- **Related artefacts:** [Improvement proposals](./app-improvement-proposals.md) · [Source of Truth (narrative)](./app-status2gpt.md)

## 1. High-Level Overview
StoresAce is a React + Vite single-page application that targets data normalization, classification, and governance for restaurant product catalogs. It emulates a full back-office suite with modules for Excel ingestion, rule-based classification, duplicate detection, rule lifecycle management, conflict resolution, and offline-first behaviour via IndexedDB and a service worker. The stack is front-end only; Supabase authentication and edge functions are stubbed with publishable keys and hard-coded fallbacks, while most persistence is simulated through browser storage.

## 2. Architecture Diagram & Narrative
```
┌─────────────────┐   mounts   ┌───────────────────────────────┐
│ public/index.html│──────────▶│ src/main.tsx (ReactDOM root) │
└─────────────────┘           └───────┬────────────────────────┘
                                       │ wraps
                                       ▼
                              ┌────────────────────┐
                              │ AuthProvider       │  (Supabase auth + mock admin)
                              └────────┬───────────┘
                                       │ provides
                                       ▼
                              ┌────────────────────┐
                              │ App.tsx            │ (QueryClient, Router, Theme)
                              └────────┬───────────┘
                                       │ renders
                                       ▼
                              ┌────────────────────┐
                              │ Routes (/ → Index) │
                              └────────┬───────────┘
                                       │ wraps
                                       ▼
                              ┌────────────────────┐
                              │ Index.tsx          │ → AppProvider (UI state)
                              └────────┬───────────┘
                                       │ embeds
                                       ▼
                              ┌────────────────────┐
                              │ AppLayout          │
                              └────────┬───────────┘
             ┌──────────────────────────┼──────────────────────────────┐
             ▼                          ▼                              ▼
     Sidebar / TopBar        Module workspace (Dashboard, Import,
    (navigation & shell)     Classify, Duplicates, Rules, Export,
                             Metrics, Profile)                         ▼
                                                           CommandPalette, dialogs,
                                                           toasts, offline indicator
```

Narrative: The Vite dev server hosts `index.html`, which loads `src/main.tsx`. The entry registers a service worker, mounts React, and wraps `App` with an authentication context. `App` configures theme, React Query, tooltips, and the router. The sole route renders `Index`, which adds UI state via `AppProvider` before delegating to `AppLayout`. `AppLayout` orchestrates the entire workspace: it manages canonical item state, persists to IndexedDB, coordinates offline synchronization, and conditionally renders feature modules. Each module composes smaller components (`src/components`), hooks (`src/hooks`), and utilities (`src/utils`) to provide domain workflows.

## 3. Module Inventory
| Module / Package | Purpose & Key Responsibilities | Core Exports | Internal Dependencies | External Dependencies |
|------------------|--------------------------------|--------------|-----------------------|------------------------|
| `src/main.tsx` | Registers service worker, mounts React tree with AuthProvider. | `registerServiceWorker` usage, React root. | `AuthProvider`, `App`, global CSS. | `react-dom`, browser SW APIs. |
| `src/App.tsx` | Sets up providers (Theme, React Query, Tooltips), routes. | `App` component. | `pages/Index`, `pages/NotFound`, theme/toaster UI. | `@tanstack/react-query`, `react-router-dom`. |
| `src/pages/Index.tsx` | Wraps layout in `AppProvider`. | `Index` component. | `components/AppLayout`, `contexts/AppContext`. | React. |
| `src/components/AppLayout.tsx` | Workspace shell, module switching, item CRUD, audit log, offline queue. | `AppLayout` component. | Sidebar/TopBar modules, `useAuth`, `useOfflineSync`, `useIndexedDB`, utilities for normalization, toasts. | `uuid`, browser storage APIs. |
| `src/contexts/AuthContext.tsx` | Supabase auth integration with mock admin, exposes auth API. | `AuthProvider`, `useAuth`. | `lib/supabase`. | `@supabase/supabase-js`. |
| `src/hooks/useIndexedDB.ts` | Minimal IndexedDB adapter for `items`/`audit` stores. | `{ db, saveItems, loadItems }`. | None. | IndexedDB API. |
| `src/hooks/useRuleRegistry.ts` | IndexedDB-backed rule catalog with seeding and CRUD. | Rule registry hook functions. | `rules/seedRules`, React state. | IndexedDB API. |
| `src/hooks/useApprovals.ts` | Approval workflow stored in IndexedDB + Supabase functions. | Approval CRUD helpers, notifications. | `useIndexedDB` (expected generic), `types/rule`. | Supabase edge functions, `crypto.randomUUID`. |
| `src/hooks/useOfflineSync.ts` | Tracks online/offline, queues pending operations. | `useOfflineSync`. | `localStorage`. | Browser network events. |
| `src/hooks/useTestCases.ts` | IndexedDB persistence for rule test cases. | `useTestCases`. | `types/rule`. | `indexedDB`. |
| `src/utils/*` (business rules, normalization, rule engine, conflict detection, exports) | Domain algorithms for normalization, classification, rule evaluation, conflict analytics, file export. | Multiple named functions/classes. | Type definitions, cross-utils. | `xlsx`, `jspdf`, `date-fns`, Canvas APIs. |
| `src/components/ui/*` | ShadCN-inspired UI primitives. | Buttons, forms, overlays, etc. | None (atomic). | Radix UI, Tailwind CSS. |
| `public/sw.js`, `utils/registerSW.ts` | Cache-first PWA setup. | Service worker script. | `registerServiceWorker`. | Service Worker API. |

## 4. Data Model
- **Runtime stores:**
  - **IndexedDB `StoresAceDB` (v1)** – object stores `items` (keyPath `id`) and `audit`. Provides offline persistence for imported/catalogued items.
  - **IndexedDB `storesace_rules`** – store `rules` (keyPath `id`, indexes `state`, `version`), seeded via `rules/seedRules` for rule management workflows.
  - **IndexedDB `storesace_testcases`** – store `testcases` with index `ruleId`.
  - **IndexedDB `StoresAceDB` v3 upgrade** – object store `ruleHistory` for versioning.
  - **LocalStorage keys:** `rule-templates`, `conflict_resolution_history`, `pendingOps` (offline queue), plus Supabase auth tokens handled internally by library.
- **Supabase:** `lib/supabase.ts` hard-codes project URL and publishable key; `AuthContext` queries `profiles` table for user profile data and listens to auth events.
- **Data lifecycle:** Excel import → normalization & validation → stored as `ItemCanonico` array in React state and persisted to IndexedDB. Classification updates mutate same store. Duplicate merge updates `duplicado` field. Exports generate CSV/PDF/JSON/Excel via utilities. Rule management flows use separate IndexedDB stores for rules, approvals, histories, templates.
- **Schema ASCII:**
```
StoresAceDB
 ├─ items{id,codigo_antigo,descricao,familia,subfamilia,class_tag,tipo,gtin,unidade,iva_code,loja_origem,observacoes,hash_normalizado,duplicado?,created_at,updated_at,created_by,updated_by}
 └─ audit{id?,action,details,user,timestamp}

storesace_rules
 └─ rules{id, name, description, version, state, kind, schedule?, nodes?/rows?/code, tests?}

storesace_testcases
 └─ testcases{id, ruleId, name, input, expectedOutput, metadata}
```
- **Constraints & indexes:** Minimal; indexes only in `storesace_rules` and `storesace_testcases`. No referential enforcement; collisions prevented in code via UUIDs.
- **Pitfalls:** `useIndexedDB` only handles `items/audit`; other hooks expect richer adapters (e.g., approvals) leading to runtime errors. Lack of migration management—version bumps risk data loss. Hard-coded Supabase credentials and mock admin circumvent backend validation.

## 5. Execution Model
- **Process:** Single-threaded browser SPA. React handles component lifecycle; React Query reserved for potential async data but mostly unused.
- **Startup path:** service worker registration → React render → Supabase session fetch (async) → AppLayout fetches IndexedDB items and seeds state.
- **Background tasks:** `useOfflineSync` listens to online/offline, sync stub logs to console. `useScheduledRules` polls schedules every minute to update rule state. Service worker intercepts fetch for cache-first responses.
- **Shutdown/cleanup:** Browser tab unload; contexts rely on React cleanup for event listeners/subscriptions.

## 6. Configuration & Secrets
- **Configuration files:** `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `eslint.config.js` define build tooling. No `.env` usage; Supabase URL/key inline. Service worker caches `sw.js` constant `CACHE_NAME`.
- **Env vars:** None declared; future introduction would require Vite `import.meta.env`.
- **Secrets handling:** Supabase publishable key committed; admin credentials hard-coded in `AuthContext`. No runtime secret storage.
- **Safe usage example:** Introduce `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, reference via `import.meta.env` to avoid hard-coding.

## 7. Integration Points
- **Supabase Auth & Edge Functions:** `AuthContext` uses `supabase.auth.*` methods; `useApprovals` invokes `functions.invoke('send-approval-notification')`. No retry/backoff or error surfacing beyond console logging.
- **File handling:** Uses `xlsx` for spreadsheet parsing and `jspdf` + custom chart generator for PDF exports. `html-to-image`, `recharts` used for visualizations (Dashboard/Metrics). `highlight.js` likely for script editors.
- **Offline infrastructure:** Service worker caches core shell. IndexedDB/localStorage persist data. No remote synchronization implemented despite placeholders.

## 8. Build, Run & Delivery
- **Local development:** `npm install`, `npm run dev` (Vite on `::`:8080). Tailwind/PostCSS integrated via `postcss.config.js`.
- **Build:** `npm run build` generates static assets; `npm run build:dev` for dev mode. `npm run preview` to serve build output.
- **Packaging:** No Docker or desktop bundler scripts; `DESKTOP_WRAPPER_GUIDE.md` outlines manual Electron/Tauri steps.
- **CI/CD:** No GitHub Actions or automation detected. Release/versioning absent (package version 0.0.0).

## 9. Observability & Operations
- **Logging:** Minimal `console.log` (service worker, offline sync). No structured logging.
- **Metrics/Tracing:** None; UI modules simulate metrics but no telemetry.
- **Health/alerts:** No health endpoints (frontend only). Offline indicator shown in UI.
- **Operational docs:** TESTING_GUIDE.md enumerates manual acceptance criteria and performance targets.

## 10. Risks, Limitations & Assumptions
- **Security:** Hard-coded Supabase credentials and admin login; `RuleEvaluator` uses `new Function` on user-provided DSL, enabling arbitrary code execution in-browser. Lack of auth guard around Supabase functions invocation. PWA caches remote assets (manifest icon) without pinning.
- **Data integrity:** `useIndexedDB` API mismatch leads to approvals/test modules failing at runtime. No deduped ID strategy aside from `Date.now()`/`Math.random()` combos. Service worker caches every GET request blindly, risking stale data.
- **Performance:** Large modules load eagerly; no code splitting. IndexedDB operations not batched; toasts and heavy charts on main thread. `mapColumns` preview slices to 200 rows but full import loops synchronously.
- **Testing:** No automated tests; reliance on manual checklist in `TESTING_GUIDE.md`.
- **Assumptions:** Application meant for demonstration; backend features stubbed. Multi-tenant or real-time updates not implemented.

## 11. Appendix
### 11.1 Trimmed File Tree
```
.
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── main.tsx · App.tsx · index.css
│   ├── components/
│   │   ├── AppLayout.tsx · Dashboard.tsx · ImportModule.tsx · ...
│   │   └── ui/ (ShadCN primitives)
│   ├── contexts/ (AuthContext, AppContext)
│   ├── hooks/ (useOfflineSync, useRuleRegistry, useApprovals, ...)
│   ├── utils/ (businessRules, normalization, ruleExecutionEngine, ...)
│   ├── data/mockData.ts
│   ├── rules/seedRules.ts
│   ├── types/ (item.ts, rule.ts, conflictHistory.ts)
│   └── pages/ (Index.tsx, NotFound.tsx)
└── docs/en/codex/architecture/ (this report and companions)
```

### 11.2 Dependency Snapshot (package.json)
- **Runtime:** React 18, React Router 6, React Query 5, Supabase JS 2, Tailwind CSS, Radix UI, shadcn/ui components, `xlsx`, `jspdf`, `html-to-image`, `highlight.js`, `recharts`, `date-fns`, `uuid`, `zod`.
- **Dev:** Vite 5, SWC React plugin, TypeScript 5, ESLint 9, Tailwind Typography, PostCSS/Autoprefixer.

### 11.3 Licensing
- Repository declares proprietary license in `README.md` (“Proprietary - BWB & Zone Soft”). No license file provided; check compliance for bundled OSS dependencies separately.

---
**Next steps:** Refer to [Improvement proposals](./app-improvement-proposals.md) for prioritized remediation and to the [Source of Truth](./app-status2gpt.md) for the canonical system snapshot.
