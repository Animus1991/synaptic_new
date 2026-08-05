# Upgrade backlog (approved @ 40a1098)

Operational / security / quality program for `synaptic_new`. **No new product features** until Wave A P0 items close.

**Principles:** correctness before refactor · one main outcome per PR · tests + rollback note · no framework rewrite.

**Repo facts (verified):** HEAD `40a1098` · `src/` 1059 · `src/lib` 734 · top-level components 83 · 316 unit · ~58 Playwright under `e2e/` · 16 migrations · ROADMAP ~99% (open: App Store, SOC2/DPA, GTM) · SMTP acknowledge-only · scrypt default · OTel present but Helm `otel.enabled: false` · `RUN_MIGRATIONS_ON_START=false` · Gitleaks on PR/push · root not npm workspaces monorepo · CI lacks CodeQL/Trivy/coverage gates.

## Baseline metrics (W0.3)

| Metric | Value | Captured |
|--------|-------|----------|
| HEAD | `40a1098` | 2026-07-19 |
| Client unit tests | 316 | `npm test` |
| E2E specs (`e2e/*.ts`) | 58 | glob |
| Migrations | 16 | `server/migrations` |
| Gitleaks | present (`secret-scan` / ci) | CI |
| Open Dependabot | record via GitHub Security → Dependabot | operator |
| Bundle sizes | `dist/stats.html` via `ANALYZE=1 npm run build:analyze` | B4 |
| E2E perf numbers | existing perf suite artifacts | pending refresh |
| RUM | POST `/v1/rum` (LCP/INP/CLS + route) | B3 |

## Wave 0 — Orientation

| ID | Status | Done when |
|----|--------|-----------|
| W0.1 Canonical docs | **done** | `docs/INDEX.md` + `docs/history/` + root `*PLAN*` stubs (link stability) |
| W0.2 Gap freeze | **done** | this file + SECURITY/ROADMAP alignment |
| W0.3 Baseline metrics | **done** | table above |

## Wave A — P0 Security / release hygiene

| ID | Status | Outcome |
|----|--------|---------|
| A1 CI security gates | **done** | audit `--omit=dev`, CodeQL, Trivy, Gitleaks |
| A2 Helm migration Job | **done** | `templates/migrate-job.yaml` + DEPLOYMENT |
| A3 SMTP delivery | **done** | `server/src/lib/email.ts` + auth wiring |
| A4 Session management UX | **done** | list/revoke APIs + Settings UI + tests |
| A5 Password hashing v2 | **done** | `$scrypt-v2$…` + lazy rehash |
| A6 LLM moderation | **done** | server regex + optional OpenAI Moderation + output check |
| A7 JWT rotation runbook | **done** | `docs/runbooks/jwt-rotation.md` |

## Wave B — P1 Observability / contracts / perf

| ID | Status | Notes |
|----|--------|-------|
| B1 `packages/shared` | **done** | error codes + Zod auth/library schemas wired on server |
| B2 OTel enablement | **done** | valid `values-staging-otel.yaml` + Deployment `OTEL_*` + runbook |
| B3 Web-vitals RUM | **done** | `webVitalsRum` → `/v1/rum` + optional Sentry |
| B4 Bundle / lazy audit | **done** | visualizer CI artifact + heavyLibLazyGuard + BUNDLE_BUDGET |
| B5 Lighthouse CI | **done** | `lighthouserc.cjs` + `npm run test:lhci` + CI artifact |
| B6 Testcontainers Postgres | **done** | `server` `test:pg` + `pgvector/pgvector:pg16` + CI `server-pg` |

## Wave C — P1 Structure / DX

| ID | Status | Notes |
|----|--------|-------|
| C1 Docs history complete | **done** | INDEX + history/ + CONTRIBUTING |
| C2 Feature-folder migration | **started** | `src/features/{rum,auth,upload,library,workspace,agent,analytics,teacher}`; remaining: more `workspace*` modules in `src/lib` |
| C3 Optional npm workspaces | pending | wait until more features land under `src/features/` |

## Wave D — P2 Product-ops

| ID | Status | Notes |
|----|--------|-------|
| D1 i18n coverage gate | pending | |
| D2 Mobile distribution lanes | pending | |
| D3 A11y widening | pending | |
| D4 SOC2/DPA docs | **draft** | `docs/compliance/SOC2_DPA.md` |
| D5 GDPR export/delete | **partial** | Settings UI existed; keep hardening |
| D6 Backup restore drill | **draft** | `docs/runbooks/backup-restore.md` |
| D7 Plugin API doc | **draft** | `docs/plugins.md` |
| D8 Admin cost/abuse dashboard | pending | |
| D9 Design clarity regression | keep | `minimalClarityContracts` mandatory |

## Wave E — Workspace interaction speed + UI/UX excellence (audited 2026-08-04, 12 panel screenshots)

Perf root causes fixed (E0): per-tool intel gates; noteBundle pipeline decoupled from store churn (sourceKey-only + debounced worker refresh + structural sharing); staggered intel activation (1 tool/idle slice, transitions); tool switches via `useTransition` + intent-time chunk prefetch; all panel chunks warmed post-stagger. **Primary root cause (CDP profiler, 60KB fixture):** `runDocumentTextPipeline` (incl. SymSpell fuzzy gate) re-ran uncached from segmentation ×6 / reader step sync / reader layout / display prep — `fuzzyCorrectToken` rebuilt the full lexicon Set per token and levenshtein-scanned the whole dictionary per unknown token. Fixed via versioned lexicon (`spellLexiconVersion`), dict/length-bucket/token caches in `miniSymSpell`, and LRU result cache in `documentTextPipeline`. Measured: worker bundle 33.9s→0.54s, intel commit 19s→94ms, max main-thread block 22.3s→1.2s, switch commits 9.5s→≤275ms. Dev diagnostics: `[ws-profiler]`, `[ws-pipeline]`, `[ws-longtask]` **removed at E14**.

**Order:** E1 → E2 → panels in pairs (E3…E13) → E14 exit gate. One panel-pair per PR. No functionality loss — transform, don't delete.

| ID | Scope | Findings (screenshots) → outcome |
|----|-------|----------------------------------|
| E0 | Perf (**done**) | Open ≈ interactive immediately; switches instant post warm-up. Dev longtask/profiler/pipeline console diagnostics removed at E14 |
| E1 | Design tokens foundation | **done** — workspace type floor + `workspaceOpticalTokens` module with contract tests (`workspaceOpticalTokens.test.ts`); platform-wide sweep: all `text-[9/10/11px]` → `type-micro`/`type-caption` (122+ files); global floor lifted micro 10→11px, caption 11→12px (workspace stays 12/13) |
| E2 | Shared tool chrome | **done** — quiet GUIDE ghost control (not filled chip); `PanelOverflowMenu` (Escape + outside dismiss) on Concept Map / Flashcards / Progress / Feynman / Whiteboard; denser ≤767px tool headers (purpose line hidden) |
| E3 | Whiteboard | **done** — canvas-first; coach collapsed by default; chrome/filters collapsible; grouped draw/shape toolbar + overflow for layers/export |
| E4 | Concept Map | **done** — theme-aware soft discs + primary label ink (was black discs / pale labels); stronger edges; legend InfoHint |
| E5 | Flashcards | **done** — filters/queues in `CollapsibleChromeSection`; deck actions in `PanelOverflowMenu`; card stage content-sized (`min-h`/`max-h`, no flex-1 dead height) |
| E6 | Quiz | **done** — single `quiz-session-meta` progress + IRT strip; `WorkspaceQuiz` uses `showIrtBadge={false}` so options don't repeat calibrating chrome |
| E7 | Feynman | **done** — primary Coach CTA (brand solid); Ask Agent secondary; Voice kept; Export/PDF in overflow; outline uses type-caption |
| E8 | Compare | **done** — Diff cells: amber wash + primary ink (AA); concept + Contrast headers |
| E9 | Debate | **done** — soft theme-aware claim/premise/support/refutation nodes (was dark jewel fills); AA rebuttal list + counters |
| E10 | Simulator + Timer | **done** — S/D graph theme tokens + stronger surplus fills; exam-block clear persists |
| E11 | Annotations | **done** — `.ws-panel-toolbar` global (was light/warm-only → run-together labels on minimal); named swatches |
| E12 | Progress | **done** — KPI row + AA weak chip; ReadinessRing band AA; single next-action card; This-week bars use secondary ink + empty `noActivity` copy |
| E13 | Tutor column + files rail | **done** — Files meta/quality caption; Listen → type-caption secondary; composer + page/preset touch floors ≤1023 |
| F | Wave F eye-harmony follow-up | **done** — F1 Progress week; F2 close titles; F3 Files ink; F4 WB icon toolbar + Sim meta strip; F5 radius map; F6 tablet touch; F7 tool OverflowChipRow + Feynman term dedupe; F8 `themeContrastContract.test.ts` |
| F0 | Hard-refresh visual QA | **partial** — 13-shot audit: most fails are **stale pre-ed13498** (labeled WB, 6 Progress chips). Follow-up: GUIDE no `title`, header overflow clip, Progress maxVisible=3 + chip testIds, Quiz singular `panelQuestion`. Re-capture after Ctrl+Shift+R → canvas `workspace-sota-uiux-audit.canvas.tsx` |
| E14 | Exit gate | **done** — diagnostics removed; `test:a11y` + `test:e2e:perf` + contrast unit tests green; LHCI a11y ≥0.95 asserted (`npm run test:lhci`, landing/dashboard/demo). Fixes: ReadinessRing band AA ink; Shell Tasks/Search accessible names; Dashboard layout toggle labels |)

## Explicitly out of scope

- Rewrite to Next/Remix  
- New major learning features before Wave A  
- History email scrub without maintainer signoff  
- Client-side LLM moderation as sole control  
- Big-bang `src/` rename in one PR  
- Full `packages/{client,server,ocr,mobile}` monorepo before shared contracts  

## Execution order

W0 → A1 → A2 → A3 → A4 → A5 → A6 → A7 → B1… → C… → D…
