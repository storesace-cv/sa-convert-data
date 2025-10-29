# StoresAce Architecture & Quality Improvement Plan

- **Repository:** sa-convert-data · **Default branch:** main · **Revision:** 71ab33a · **Generated:** 2025-10-29T10:28:20Z (UTC)
- **Related artefacts:** [Deep-dive report](./app-deep-dive-report.md) · [Source of Truth (narrative)](./app-status2gpt.md)

## Strategy Summary
Focus first on blocking defects that prevent critical modules (approvals, timelines, rule governance) from running, and on closing the most severe security exposures (hard-coded credentials, unsafe DSL execution). Once stability and security are restored, establish automated testing, observability, and configuration hygiene to make the SPA production-ready. Optimize performance and developer experience after the foundation is solid.

## Prioritized Backlog
| Priority | Initiative | Rationale | Impact | Risk | Effort |
|----------|------------|-----------|--------|------|--------|
| **P0** | Rebuild IndexedDB data layer for approvals/history/testcases | Current `useIndexedDB` hook lacks CRUD methods required by multiple modules, causing runtime failures. | Unblocks rule governance, prevents data loss. | Medium (browser storage complexity). | High (shared refactor). |
| **P0** | Secure authentication & rule execution | Hard-coded admin credentials, inline Supabase keys, and `new Function` DSL evaluation introduce severe security risk. | Protects user data, avoids remote code execution. | Medium (requires design decisions). | High. |
| **P1** | Establish automated QA pipeline | No automated tests; only manual checklist. | Prevents regressions, supports CI adoption. | Low. | Medium. |
| **P1** | Strengthen offline & sync behaviour | Offline queue never drains persisted ops; service worker caches stale data. | Improves reliability for PWA use cases. | Medium. | Medium. |
| **P1** | Introduce structured logging & metrics hooks | Operations lack visibility. | Enables monitoring & troubleshooting. | Low. | Medium. |
| **P2** | Performance & UX optimization | Modules load eagerly; heavy exports on main thread. | Enhances responsiveness and user satisfaction. | Low. | Medium. |
| **P2** | Developer experience upgrades | Missing env scaffolding, lint/format guardrails. | Speeds onboarding, enforces consistency. | Low. | Low. |

## Detailed Proposals
### 1. Rebuild IndexedDB Data Layer (P0)
- **Problem:** `useApprovals`, `useTemplates`, `useRuleHistory`, and other hooks expect generic CRUD helpers (`getAll`, `add`, `update`, `getById`), but `useIndexedDB.ts` only exposes `saveItems`/`loadItems` for a fixed store. Modules crash when accessing undefined methods.
- **Proposal:** Extract a shared storage service (`src/lib/indexedDbClient.ts`) that wraps `indexedDB` with promise-based CRUD, dynamic store initialization, and upgrade handlers. Update hooks to consume this client and ensure stores (`approvalRequests`, `approvalTimelines`, etc.) are created/upgraded in one place.
- **Acceptance Criteria:**
  1. Hooks compile and run without runtime errors across approvals, history, schedules, templates, test cases.
  2. Data persists between sessions (verified via manual reload).
  3. Versioned migrations apply cleanly (simulated upgrade path tested).
- **Estimated Effort:** 4–5 developer days.
- **Risks/Trade-offs:** Requires careful migration to avoid wiping existing stores; consider schema versioning strategy and fallback for legacy data.

### 2. Secure Authentication & Rule Execution (P0)
- **Problem:** Supabase URL and anon key are hard-coded; admin credentials bypass Supabase. `RuleEvaluator` executes user-controlled DSL via `new Function`, allowing arbitrary JS execution.
- **Proposal:**
  - Move Supabase credentials to Vite env variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and enforce loading via configuration service. Remove hard-coded admin or gate behind feature flag for demos.
  - Replace `new Function` DSL evaluation with a sandboxed interpreter (e.g., use safe expression parser or limited AST evaluator). Enforce allowlist of operations and add depth/time guards.
  - Implement role-based checks before invoking Supabase edge functions.
- **Acceptance Criteria:**
  1. Build fails if env vars are missing; credentials no longer stored in repo.
  2. No hard-coded passwords in production code path.
  3. Rule execution rejects malicious payloads (unit tests covering blacklisted expressions).
- **Estimated Effort:** 5–6 developer days.
- **Risks/Trade-offs:** Sandbox may limit advanced DSL capabilities; document supported syntax.

### 3. Automated QA Pipeline (P1)
- **Problem:** No tests or CI; regressions likely.
- **Proposal:**
  - Introduce Vitest or Jest for unit tests on utilities (`normalization`, `businessRules`, `ruleValidator`).
  - Add React Testing Library smoke tests for critical modules (Import, RulesManager).
  - Configure GitHub Actions (or alternative) to run lint + test on push.
  - Track coverage thresholds (e.g., 70% for utils).
- **Acceptance Criteria:**
  1. `npm test` (or `npm run test`) executes deterministically in CI.
  2. Coverage report generated and enforced.
  3. Pipeline blocks merges on failure.
- **Estimated Effort:** 3–4 developer days.
- **Risks/Trade-offs:** Initial investment; must maintain fixtures for IndexedDB (use `fake-indexeddb`).

### 4. Offline & Sync Reliability (P1)
- **Problem:** Offline queue persists to localStorage but never rehydrates; service worker caches all requests indiscriminately, risking stale data.
- **Proposal:**
  - Load `pendingOps` from storage on boot; implement replay strategy when back online with retry/backoff.
  - Scope service worker caching via workbox or manual route list; add versioned precache manifest.
  - Add UI feedback for sync success/failure.
- **Acceptance Criteria:**
  1. Pending operations stored offline are replayed after reconnection (manual test scenario).
  2. Service worker updates on deploy (cache bust) and respects network-first for API calls.
  3. Visual indicators reflect sync status changes.
- **Estimated Effort:** 2–3 developer days.
- **Risks/Trade-offs:** Increased complexity; ensure queue resilient to malformed ops.

### 5. Observability Foundations (P1)
- **Problem:** No structured logging/metrics; debugging production issues impossible.
- **Proposal:**
  - Introduce lightweight logging utility (e.g., Pino browser or custom) with log levels, integrate across key flows.
  - Add metrics hooks (in-memory counters surfaced to dashboard) and instrumentation for rule execution timings.
  - Prepare integration points for remote telemetry (placeholder adapters for future APM).
- **Acceptance Criteria:**
  1. Logs include level, context, and correlation IDs for rule executions/approvals.
  2. Metrics panel displays actual aggregated numbers derived from instrumentation.
  3. Logging can be toggled via env configuration.
- **Estimated Effort:** 2 developer days.
- **Risks/Trade-offs:** Must avoid excessive noise; ensure PII not logged.

### 6. Performance & UX Optimization (P2)
- **Problem:** SPA loads all modules eagerly; heavy exports (XLSX/PDF) run on main thread; large bundles.
- **Proposal:**
  - Adopt route- or module-level code splitting using `React.lazy`.
  - Offload CPU-heavy exports to Web Workers.
  - Optimize charts (virtualization, memoization) and limit preview row counts with pagination.
- **Acceptance Criteria:**
  1. Initial bundle reduced (measure via `npm run build` bundle analyzer).
  2. UI remains responsive during export (no >1s main-thread freeze).
  3. Lighthouse performance score ≥ 80 on reference dataset.
- **Estimated Effort:** 3 developer days.
- **Risks/Trade-offs:** Additional complexity for worker messaging; ensure tests cover lazy loading.

### 7. Developer Experience Upgrades (P2)
- **Problem:** No env scaffolding, pre-commit hooks, or formatting standards.
- **Proposal:**
  - Add `.env.example`, update README with env instructions.
  - Integrate Prettier + ESLint with consistent config; add Husky/lefthook pre-commit.
  - Provide `npm run lint:fix`, `npm run format`, and storybook or styleguide for UI components.
- **Acceptance Criteria:**
  1. Repo includes sample env and setup instructions.
  2. Pre-commit stops formatting/linting violations.
  3. Developer docs updated (DESKTOP_WRAPPER_GUIDE/README) with new tooling steps.
- **Estimated Effort:** 2 developer days.
- **Risks/Trade-offs:** Developers must install git hooks locally; document opt-out for CI.

## Architecture Remediation Themes
- Consolidate persistence access through a service layer; enforce schema migrations and shared error handling.
- Define domain boundaries (Import/Classify/Duplicates/Rules) with typed interfaces and DTOs rather than sharing mutable `ItemCanonico` arrays.
- Introduce anti-corruption layer for Supabase responses to decouple from direct API shapes.

## Testing Plan
- Aim for ≥70% coverage on `src/utils` and ≥50% on hooks via Vitest + `@testing-library/react` with `fake-indexeddb`.
- Add deterministic fixtures for Excel import, classification, duplicate detection, and rule execution scenarios.
- Provide smoke E2E (Playwright) to cover auth, import, classification, approvals.
- Seed data via dedicated test harness, not production mock data.

## Developer Experience Enhancements
- Publish onboarding guide referencing `npm run dev`, env setup, and testing commands.
- Add `make` or npm scripts for `format`, `lint`, `test`, `build`, `analyze`.
- Document code style (naming, module boundaries) in CONTRIBUTING.md.

## Operations & Observability Upgrades
- Define logging taxonomy (e.g., `AUTH`, `IMPORT`, `RULE_ENGINE`, `SYNC`).
- Collect rule execution timing metrics and expose aggregated values in Metrics module.
- Instrument PWA lifecycle (install prompt display rate, offline usage) for analytics.
- Prepare runbooks for cache busting and IndexedDB migrations.

## Security & Compliance Roadmap
- Formalize credential management (env vars + secrets vault for desktop bundlers).
- Implement data retention controls: allow users to purge local data and audit logs.
- Clarify lawful basis for personal data processed in audit logs; add consent notices where required.
- Evaluate GDPR/ANGOLA VAT compliance for stored tax codes.

## 30/60/90 Day Roadmap
- **Day 0–30 (Stabilize):** Deliver P0 items (IndexedDB refactor, auth/DSL security). Add smoke tests for import/classify. Provide env scaffolding.
- **Day 31–60 (Harden):** Complete P1 initiatives: automated CI, offline sync improvements, logging/metrics. Draft operational runbooks.
- **Day 61–90 (Optimize):** Tackle P2 tasks—performance optimization, developer tooling, UX polish. Begin telemetry integration and advanced testing (E2E, load).

---
Consult the [Deep-dive report](./app-deep-dive-report.md) for context and the [Source of Truth](./app-status2gpt.md) for the latest canonical system view.
