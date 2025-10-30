# StoresAce Source of Truth Snapshot

- **Repository:** sa-convert-data · **Default branch:** main · **Revision:** 71ab33a · **Generated:** 2025-10-29T10:28:20Z (UTC)
- **Companion artefacts:** [Deep-dive report](./app-deep-dive-report.md) · [Improvement proposals](./app-improvement-proposals.md)

## How to Read this SoT
- Each section mirrors the machine-readable [status index](./app-status-index.json).
- Use this document for rapid orientation; consult the deep-dive for extensive rationale and the proposals for actionable plans.
- Bullets list canonical truths as of the revision above; update both this file and the JSON together when changes occur.

## Stack Overview
- **Languages:** TypeScript with supplemental JavaScript and CSS/Tailwind layers.
- **Frameworks & libs:** React 18, React Router, Radix UI/ShadCN, React Query, Tailwind CSS.
- **Build toolchain:** Vite + SWC, PostCSS, Tailwind CLI. Runtime served in browser; Node.js powers builds.

## Entry Points
- **CLI workflows:** `npm run dev`, `npm run build`, `npm run preview`.
- **GUI bootstrap:** `src/main.tsx` mounts the SPA on `#root` and registers the service worker.
- **Services:** None—frontend-only deployment; Supabase accessed directly from browser.

## Module Highlights
1. **src/main.tsx** – Registers the service worker and renders `<App />` inside `AuthProvider`.
2. **src/App.tsx** – Applies theme, React Query provider, tooltips, and defines router paths (`/`, catch-all 404).
3. **src/components/AppLayout.tsx** – Shell for navigation, module switching, IndexedDB-backed item state, offline sync, toasts.
4. **src/contexts/AuthContext.tsx** – Supabase auth session/profile manager with mock admin bypass and reset/update helpers.
5. **src/hooks/useRuleRegistry.ts** – IndexedDB CRUD + seeding for rules, exposing getters and persistence methods.
6. **src/hooks/useApprovals.ts** – Approval request/timeline workflow, relying on IndexedDB helper (currently incomplete) and Supabase Edge functions.
7. **src/utils/ruleExecutionEngine.ts** – Runs decision tree/table/script rules, tracking execution timing and errors.
8. **src/utils/conflictDetector.ts** – Detects overlapping/contradictory/duplicate/schedule conflicts among rules.
9. **public/sw.js** – Cache-first service worker precaching `/`, `index.html`, and `manifest.json` while caching subsequent GETs.

## Persistence & Data
- Browser storage only: IndexedDB stores `items`, `audit`, `rules`, `ruleHistory`, `testcases`; localStorage keeps templates, conflict histories, pending offline operations.
- Supabase used for authentication/profile lookups with publishable key embedded; no backend database bundled.
- Schema migrations absent; store versioning handled piecemeal within hooks.

## Configuration & Secrets
- Tooling configs: `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig*.json`, `eslint.config.js`.
- No environment variables; Supabase URL and anon key hard-coded in `src/lib/supabase.ts`. `AuthContext` contains hard-coded admin credentials.

## Tests & Quality Gates
- Automated tests **do not exist**; `TESTING_GUIDE.md` provides manual acceptance criteria and performance targets only.

## Observability & Operations
- Logging limited to `console.log` statements in service worker registration and offline sync hook.
- Metrics displayed in Dashboard/Metrics modules derive from client-side computations; no external telemetry.
- No tracing, health endpoints, or alerting configured.

## Security Posture
- Known threats: exposed Supabase credentials, mock admin login, unsandboxed DSL execution via `new Function`, permissive service worker caching.
- Existing controls: Supabase auth APIs and rudimentary role metadata. No secret rotation or policy enforcement.

## Known Gaps
- IndexedDB helper lacks generic CRUD expected by approvals/history/test hooks, leading to runtime failures.
- Absence of automated tests or CI.
- Offline queue persists but never replays operations; cache strategy risks stale data.
- Configuration secrets stored in source control.

## Roadmap Snapshot
- **P0:** Rebuild IndexedDB data layer; secure Supabase configuration and sandbox rule execution paths.
- **P1:** Add automated QA pipeline, improve offline sync/cache strategy, introduce structured logging and metrics.
- **P2:** Optimize performance with code splitting/workers; enhance developer tooling and documentation.

---
For deeper architectural analysis refer to the [app-deep-dive report](./app-deep-dive-report.md). For prioritized remediation details see the [improvement plan](./app-improvement-proposals.md). Keep this SoT synchronized with any substantial changes.

> SoT updated for SQLite-LP at 2025-10-30T14:29:32Z.
