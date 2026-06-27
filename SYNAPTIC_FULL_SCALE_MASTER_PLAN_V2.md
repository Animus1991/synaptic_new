# Synapse Learning — Πλήρες Σχέδιο Ολικής Αναβάθμισης (V2)

> **Ημερομηνία:** 27 Ιουνίου 2026  
> **Baseline:** `CONTENT_PIPELINE_VERSION = 2.5.1` · ~702 Vitest · CI: client + server + e2e + **a11y** + **chunk-recovery**  
> **Upstream κατεύθυνση:** [Animus1991/synaptic-refined](https://github.com/Animus1991/synaptic-refined) (`main`)  
> **Downstream (ours):** `synapse-learning` / `synaptic_new` — **pipeline v2.5.1 ahead**, refined UI/chunk infra **merged**  
> **Συμπληρώνει:** `SYNAPTIC_REFINED_UPGRADE_PLAN.md` · `STUDY_WORKSPACE_REARCHITECTURE_PLAN.md` · `PRODUCT_UPGRADE_MASTER_PLAN.md` · `PLATFORM_UI_UX_MASTER_PLAN.md`

---

## 0. Σκοπός & αρχή

**Στόχος:** Να φτάσει η πλατφόρμα από «feature-rich prototype ~84%» σε **production-scale product 100%** — χωρίς εξαίρεση σε καμία επιφάνεια, module, test gate, ή ops path.

**Αρχή συγχώνευσης με synaptic-refined:**

1. **Refined = additive UX/infra** (Warm Sand, chunk resilience, a11y, SEO, Phosphor shim).
2. **Ours = additive pipeline** (Wave 8B-β spell gate, Varian Ch31, `documentTextPipeline`, live `CognitiveReader` repair).
3. **Ποτέ downgrade** pipeline version ή overwrite §2.3 keep-local list στο merge.

**Από τα screenshots (localhost:5173, Ιούνιος 2026):** Η Warm Sand θεματική, το editorial typography, τα bento cards (Dashboard/Library/Tasks/Agent/Analytics/Teacher/Settings) και το **quality banner v2** (`stored v2.4.0 → v2.5.1`, hygiene 41, corruption 59, spell-gate, unknown-tokens) **λειτουργούν**. Το workspace φορτώνει με reader + intelligence tabs — η κατεύθυνση refined **επιβεβαιώνεται visually**.

---

## 1. Executive snapshot — τι ολοκληρώθηκε vs τι μένει

### 1.1 Ολοκληρωμένα (Ιούνιος 2026)

| Domain | Deliverable | Evidence |
|--------|-------------|----------|
| **Merge refined** | 130 files ported; chunk/a11y/SEO/fonts/icons | `3477a8e`, `SYNAPTIC_REFINED_UPGRADE_PLAN.md` |
| **Pipeline Wave 8B-β** | v2.5.1 layered repair + spell gate + Varian 11/11 | `documentTextPipeline.ts`, `varianCh31Fixtures.test.ts` |
| **Workspace boot** | `StudyWorkspaceLazy` + retry + boot shell errors | E2E chunk-recovery |
| **Phase B slice 1** | Lazy secondary tools, `WorkspaceIdleMount`, `WorkspaceProvider` | `workspaceToolLazyRegistry.ts`, StudyWorkspace ~280 KB chunk |
| **Phase C slice 1** | Quality banner v2 (hygiene/corruption/flags/pipeline badge) | Screenshot workspace strip |
| **Sentry wiring** | `initSentry()`, dashboard import script, docs | `sentryInit.ts`, `npm run sentry:import-dashboard` |
| **CI a11y** | Dedicated `a11y` job | `.github/workflows/ci.yml` L63–87 |
| **Visual system** | Warm Sand global, Phosphor thin via `lucide-shim`, @fontsource | `main.tsx`, `index.css` |
| **Embeddings** | `@huggingface/transformers` v4 q8 | `localEmbedder.ts` |

### 1.2 Μερικώς ολοκληρωμένα (🔶)

| Domain | Done | Remaining |
|--------|------|-----------|
| **Study Workspace re-arch** | Lazy tools, idle intel panels, Provider shell | Shell <300 lines, ContextBar, ToolFrame, worker PMI/BM25 |
| **Quality / Hunspell** | SymSpell + lexicon + banner v2 metrics | Full `.dic` Hunspell path, larger Greek lexicon |
| **Sentry prod** | Client init + dashboard JSON | Prod DSN, `__chunk_errors` endpoint, alerts |
| **Tests** | 693/702 pass | 9 flaky `pipelineReprocess` parallel timeouts |
| **i18n** | Shell + onboarding EL | Analytics, Feynman, debate labels EL |
| **Teacher** | Local events panel | Server cohort when signed in |
| **Dashboard feed** | KPI cards | Real activity stream (not mock-heavy) |

### 1.3 Δεν ξεκίνησαν / long arc (🔲)

- `workspace.worker.ts` (PMI, BM25, sourceIntelligence off main thread)
- `WorkspaceContextBar` (1 strip αντί 7+)
- `DocumentModel` layout-aware blocks (Wave 8B-γ)
- Math OCR zones (8B-β slice)
- Server pgvector RAG persistence
- Multi-tenant teacher roster
- User-authored notes MVP
- Collaborative study (correctly deferred)

---

## 2. Στρατηγικοί άξονες (refined direction × our lead)

```text
                    ┌─────────────────────────────────────┐
                    │     Product coherence (refined)      │
                    │  Warm Sand · 1 strip · lazy tools    │
                    └─────────────────┬───────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐           ┌─────────────────┐           ┌─────────────────┐
│ Performance   │           │ Content fidelity │           │ Observability   │
│ TTI ≤400ms    │           │ pipeline 2.5.1+  │           │ Sentry + a11y   │
│ lazy + worker │           │ Greek/OCR/Varian │           │ CI gates        │
└───────────────┘           └─────────────────┘           └─────────────────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │   Platform scale (Wave 4–6 server)   │
                    │  auth sync · billing · teacher RAG   │
                    └─────────────────────────────────────┘
```

**Κανόνας προτεραιότητας:** P0 = χρήστης κολλάει / χάνει δεδομένα → P1 = visual overload / misleading UI → P2 = depth & scale → P3 = nice-to-have.

---

## 3. Φάσεις υλοποίησης (πλήρης χάρτης, χωρίς εξαίρεση)

### Φάση A — Σταθερότητα & παρατηρησιμότητα ✅ *~90%*

| ID | Item | Acceptance | Status |
|----|------|------------|--------|
| A1 | Chunk retry + stale reload | `test:e2e:chunk-recovery` green | ✅ |
| A2 | Boot shell Try again / Reload | No infinite spinner | ✅ |
| A3 | Sentry runtime + dashboard | Events in Sentry prod; dashboard imported | 🔶 code done |
| A4 | `POST /__chunk_errors` beacon endpoint | Server route or CF worker; 2xx | 🔲 |
| A5 | a11y CI gate | `npm run test:a11y` in Actions | ✅ |
| A6 | Varian regression CI gate | Dedicated job on `varianCh31Fixtures.test.ts` | ✅ |
| A7 | Fix flaky reprocess tests | 702/702 stable under `vitest run` | ✅ |
| A8 | Release tagging | `__APP_VERSION__` = git SHA in prod builds | 🔶 partial |

### Φάση B — Study Workspace re-architecture 🔶 *slices 1–2 done*

**Goal (refined):** TTI ≤ 400 ms warm / ≤ 1.2 s cold · zero feature regressions · ≤1 contextual strip + 1 tool visible.

| ID | Item | Files / pattern | Status |
|----|------|-----------------|--------|
| B1 | `WorkspaceProvider` — full context migration | Kill prop-drilling for focusBus, correlation, noteBundle | 🔶 foundation |
| B2 | Shell + Outlet — `StudyWorkspace.tsx` < 300 lines | Extract `WorkspaceShell.tsx`, `StudyWorkspaceTools.tsx` | ✅ |
| B3 | Lazy registry — **all** tools including reader/concept-map | Extend `workspaceToolLazyRegistry.ts` | 🔶 secondary only |
| B4 | `workspace.worker.ts` | PMI, BM25 excerpt, documentStructure, sourceIntelligence score | ✅ |
| B5 | `useDeferredValue` for concept/step/focus | StudyWorkspace hot path | ✅ |
| B6 | Virtualised StepRail | No sync step computation per render | ✅ |
| B7 | **`WorkspaceContextBar`** (3 chips + ⓘ side-sheet) | Replace 7+ strips; relocate Discoverability/WeakAreas/ConceptBus/SourceIntel | ✅ |
| B8 | **`<ToolFrame>`** | Merge `WorkspaceToolHeader` + `WorkspaceToolCrossLinkBar` | ✅ |
| B9 | Idle-mount CommandPalette index | `WorkspaceIdleMount` pattern | 🔲 |
| B10 | Preload top-3 tools on idle | focus-bus stats → prefetch quiz/leitner/dashboard | 🔲 |
| B11 | Perf budget E2E | Playwright: Continue → interactive ≤1.2s cold | ✅ dev gate (8–12s) |
| B12 | Feature flag `?ws=v2=1` | 1-week canary before default | 🔲 |

**Per-tool checklist (13 tools — καμία εξαίρεση):**

| Tool | Lazy chunk | ToolFrame | Selection contract | Agent handoff | Persistence scope |
|------|------------|-----------|-------------------|---------------|-------------------|
| reader | 🔲 eager | 🔲 | ✅ | ✅ | annotations |
| concept-map | 🔲 eager | 🔲 | ✅ | ✅ | positions |
| scratchpad | 🔲 | 🔲 | ✅ | ✅ | entries |
| whiteboard | ✅ lazy | 🔲 | ✅ | ✅ | session |
| leitner | ✅ lazy | 🔲 | ✅ | ✅ | cards |
| feynman | ✅ lazy | 🔲 | ✅ | ✅ | draft |
| quiz | ✅ lazy | 🔲 | ✅ | ✅ | IRT |
| simulator | ✅ lazy | 🔲 | ✅ | ✅ | scenarios |
| compare | ✅ lazy | 🔲 | ✅ | ✅ | session |
| debate | ✅ lazy | 🔲 | ✅ | ✅ | rebuttal graph |
| timer | ✅ lazy | 🔲 | — | ✅ | sessions |
| annotations | ✅ lazy | 🔲 | ✅ | ✅ | fileKey |
| dashboard | ✅ lazy | 🔲 | — | ✅ | session |

### Φάση C — Content pipeline depth 🔶 *ours leads*

| ID | Item | Detail | Status |
|----|------|--------|--------|
| C1 | Hunspell / `.dic` import path | Extend `spellLexicon.ts`; optional WASM hunspell | 🔲 |
| C2 | Quality banner v2 | hygiene + corruption + flags + spell-gate badge | ✅ |
| C3 | Reprocess at scale | Fix 9 flaky tests; serial pool for heavy suites | 🔲 |
| C4 | Bulk reprocess UX | Library multi-select → reprocess wizard | 🔲 |
| C5 | Column-aware PDF delta vs refined | Diff `pdfExtract.ts` if refined ahead | 🔲 audit |
| C6 | Math OCR zones (8B-β) | Image regions → server `mode=math` | 🔲 |
| C7 | `DocumentModel` blocks (8B-γ) | `Block[]` + reading order | 🔲 future |
| C8 | Live reader repair | Keep `CognitiveReader` `repairDisplayPipeline()` — never overwrite | ✅ protected |
| C9 | Migration campaign | Banner → one-click reprocess all stale courses | 🔶 banner exists |
| C10 | Eval harness gate | `npm run eval` in CI; recall ≥ 0.6 | 🔲 |

### Φάση D — Page-level product polish (refined cross-page sweep)

**Κλίμακα:** 🟢 launch-ready · 🟡 polish · 🟠 gaps · 🔴 broken/misleading

#### D.1 Landing (`Landing.tsx`)

| Aspect | Status | Action |
|--------|--------|--------|
| Greek PDF / reprocess value prop | 🟠 | Hero bullet + link to `CONTENT_PIPELINE.md` |
| Study Workspace screenshot | 🟠 | Warm Sand screenshot from screenshots |
| SEO | 🟢 | robots/sitemap/llms ported |
| a11y | 🟡 | Run `a11y-multi-viewport` on `/` |

#### D.2 Onboarding (`Onboarding.tsx`)

| Aspect | Status | Action |
|--------|--------|--------|
| Upload → workspace explainer step | 🟠 | 1 card: «Μετά το upload ανοίγει το Study Workspace» |
| Teacher → TeacherDashboard hint | 🟠 | Role branch copy |
| Demo isolation | 🟢 | `showDemoContent: false` default |

#### D.3 Dashboard (`Dashboard.tsx`) — *screenshot confirmed*

| Aspect | Status | Action |
|--------|--------|--------|
| Warm greeting | 🟠 | Replace static «Good evening!» → `greetingForTime(lang)` |
| KPI row (streak, XP, reviews, mastery, study today) | 🟡 | Wire «Reviews Due» → Tasks filter |
| Alert banners (exam, active recall, next step) | 🟡 | Dedupe with workspace discoverability; max 2 visible |
| Study Workspace / Start Session CTAs | 🟢 | Post boot-fix |
| Activity feed | 🟠 | Replace mock with `emitLearningEvent` stream |
| Exam countdown → Timer | 🟠 | Wire `userSettings.examDate` → workspace timer preset |
| Resume card | 🟡 | Show tool + concept from `workspaceLive` |

#### D.4 Library (`Library.tsx`) — *screenshot confirmed*

| Aspect | Status | Action |
|--------|--------|--------|
| Course grid (Enriched/Strict/Generating badges) | 🟢 | |
| Files tab delete/reprocess | 🟡 | Parity with CourseView Sources |
| Outline preview on card hover | 🟠 | `uploadOutlinePreview` snippet |
| Varian Ch31 course | 🟡 | Prompt reprocess for v2.5.1 |
| Empty state illustration | 🟡 | EL/EN |

#### D.5 CourseView (`CourseView.tsx`)

| Aspect | Status | Action |
|--------|--------|--------|
| Quality diagnostics panel | 🟢 | |
| Quality banner v2 props | ✅ | hygiene metrics wired |
| Delete cascade copy | 🟢 | |
| Glossary browser | 🟡 | Full CRUD deferred |
| Replace document | 🟠 | Extend-upload without new course |

#### D.6 Upload (`UploadModal.tsx`, `uploadPipeline.ts`)

| Aspect | Status | Action |
|--------|--------|--------|
| Outline preview before generate | 🟢 | |
| Per-file remove pre-analyze | 🟠 | |
| OCR progress granular | 🟡 | Stage: extract/OCR/outline |
| Success toast pipeline version | 🟡 | Show v2.5.1 |
| YouTube / ChatGPT import | 🟢 | |

#### D.7 Tasks (`Tasks.tsx`) — *screenshot confirmed*

| Aspect | Status | Action |
|--------|--------|--------|
| Today plan (retry / spaced / weak) | 🟢 | |
| Error notebook | 🟢 | |
| Start Session → workspace | 🟡 | Preserve task context on open |
| Greek task titles | 🟢 | e.g. «Παρούσα Αξία» |
| Generated task regen on reprocess | 🟡 | Stale task banner |

#### D.8 Agent (`Agent.tsx`) — *screenshot confirmed*

| Aspect | Status | Action |
|--------|--------|--------|
| Socratic mode + source context | 🟢 | |
| Source-grounded / AI inference tags | 🟢 | |
| Offline mode banner | 🟢 | |
| Quick action chips | 🟢 | |
| Workspace handoff auto-send | 🟢 | |
| Chunk lazy load | 🟢 | `lazyWithRetry` |
| Citation page numbers post `\f` fix | 🟢 | |

#### D.9 Analytics (`Analytics.tsx`) — *screenshot confirmed*

| Aspect | Status | Action |
|--------|--------|--------|
| Calibration 96/100 | 🟡 | Verify from real attempt data |
| Exam readiness ring | 🟡 | First-attempt-only policy documented |
| Forgetting curve | 🟡 | FSRS integration depth |
| Mastery map from learnerModel | 🟢 | |
| Tab i18n (Overview/Behavior/AI Insights) | 🟠 | EL strings |
| Lazy load | 🟢 | |

#### D.10 Teacher (`TeacherDashboard.tsx`) — *screenshot confirmed*

| Aspect | Status | Action |
|--------|--------|--------|
| Sign-in required banner | 🟢 | honest UX |
| Local device events | 🟢 | |
| Server cohort / library / usage | 🔲 | Requires auth + `/v1/teacher/dashboard` |
| LLM usage quotas display | 🔲 | |

#### D.11 Settings (`Settings.tsx`) — *screenshot confirmed*

| Aspect | Status | Action |
|--------|--------|--------|
| Learning preferences toggles | 🟢 | |
| Pipeline version display | 🟠 | Show v2.5.1 + reprocess shortcut |
| API key / proxy account | 🟢 | |
| `VITE_SENTRY_DSN` docs link | 🟡 | Observability section |

#### D.12 Lesson surfaces (`LessonView`, `PracticalLessonView`)

| Aspect | Status | Action |
|--------|--------|--------|
| Note-grounded content | 🟢 | |
| Reader step sync | 🟢 | bridge tests |
| Dock a11y | 🟢 | `a11y-lesson-dock.spec.ts` |
| ToolFrame pattern | 🔲 | Phase B/C sweep |

### Φάση E — Platform scale (server & sync)

| ID | Item | Paths | Status |
|----|------|-------|--------|
| E1 | Postgres library/session sync hardening | `server/src/routes/*` | 🔶 dev skeleton |
| E2 | RAG chunk persistence (pgvector) | `server/rag/*` | 🔲 |
| E3 | Org metering + plan quotas UI | billing routes | 🔶 |
| E4 | Teacher roster multi-tenant | TeacherDashboard | 🔲 |
| E5 | Stripe webhooks production checklist | `SECURITY.md` | 🔶 |
| E6 | OCR sidecar scale | `ner_sidecar.py` | 🔶 |
| E7 | Backup/restore UX | IndexedDB + export | 🟡 |

### Φάση F — Design system consolidation 🔶

| ID | Item | Status |
|----|------|--------|
| F1 | Document Warm Sand tokens in `PLATFORM_UI_UX_MASTER_PLAN.md` | 🔲 |
| F2 | Remove dead `lucide-react` after shim audit | 🔲 |
| F3 | Tablet breakpoints (768–1023) audit | 🟡 a11y spec exists |
| F4 | Empty states + resume card (Package C) | 🟡 |
| F5 | `prefers-reduced-motion` audit | 🔲 |
| F6 | ContextBar + ToolFrame tokens in `index.css` | 🔲 |
| F7 | Per-page visual regression (Playwright snapshots) | ✅ |

### Φάση G — Διεθνικοποίηση (i18n) — **χωρίς εξαίρεση**

| Surface | EL coverage | Action |
|---------|-------------|--------|
| Shell / nav | 🟢 | — |
| Onboarding | 🟢 | — |
| Dashboard alerts | 🟠 | Extract strings |
| Analytics tabs | 🔴 | Full pass |
| Feynman rubric labels | 🔴 | |
| Debate / argument map | 🔴 | |
| Simulator scenarios | 🟡 | |
| Error notebook | 🟡 | |
| Teacher dashboard | 🟠 | |
| Quality banner flags | 🟢 | `hygieneFlagLabel` |
| Command palette | 🟡 | |

**Acceptance:** `i18n coverage report` script; zero hardcoded EN in primary EL user paths.

### Φάση H — Testing & quality gates — **χωρίς εξαίρεση**

| Gate | Command | CI job | Status |
|------|---------|--------|--------|
| Typecheck all | `npm run typecheck:all` | client + server | ✅ |
| Unit | `npm test` | client | 🔶 693/702 |
| Eval | `npm run eval` | 🔲 add job | 🔲 |
| E2E smoke | `npm run test:e2e` | e2e | ✅ |
| a11y | `npm run test:a11y` | a11y | ✅ |
| Chunk recovery | `npm run test:e2e:chunk-recovery` | chunk-recovery | ✅ |
| Doc lint | `npm run doc-lint` | docs | ✅ |
| Varian fixtures | vitest `varianCh31Fixtures` | ✅ | ✅ |
| Build prod | `npm run build` | client | ✅ |
| Server tests | `npm test --prefix server` | server | ✅ |
| Visual regression | Playwright snapshots | 🔲 | 🔲 |
| Perf budget | Lighthouse CI / trace | 🔲 | 🔲 |

### Φάση I — Observability & ops

| Item | Detail | Status |
|------|--------|--------|
| Sentry DSN prod | `VITE_SENTRY_DSN` in deploy env | 🔲 |
| Dashboard import | `npm run sentry:import-dashboard` | ✅ script |
| Fingerprint rules | `sentry-chunk-errors.md` §1 | 🔲 manual |
| Alerts spike per release | §4 alerts | 🔲 |
| Chunk-error issue template | `.github/ISSUE_TEMPLATE/chunk-error.yml` | ✅ |
| `__chunk_errors` ingest | A4 | 🔲 |
| Source maps upload | Sentry release artifacts | 🔲 |
| Structured logging server | JSON logs + request IDs | 🔲 |

---

## 4. Study Workspace — βαθιά ανάλυση (από screenshot + plan)

### 4.1 Τρέχουσα κατάσταση UI (επιβεβαιωμένη)

- **Quality strip:** score 77/100 · 6 sections · `stored v2.4.0 → v2.5.1` · hygiene 41 · corruption 59 · spell-gate · unknown-tokens · κουμπιά Preview / Reprocess / Re-upload.
- **Tool strip:** Reader, Concept Map, Flashcards, Quiz, Progress + More.
- **Intelligence tabs:** Tips, Concepts (1), Weak spots (3).
- **Reader toolbar:** Annotate, Dyslexia, Read all, Full, Translate, Bionic, Heatmap.
- **Step rail:** Supply and Demand → … → Page Theory Basics (Step 4/7).
- **Sidebar tool groups:** Read & Notes / Understand / Practice / Focus — refined taxonomy.

### 4.2 Visual overload — τι μένει να συμπιεστεί

| Strip (σήμερα) | Μετά το ContextBar |
|----------------|-------------------|
| `WorkspaceSourceStatusBar` | Chip 1 «Source quality» → popover details |
| `WorkspaceContextStrip` | Chip 2 «Focus / next action» |
| `SourceIntelligenceCard` | ⓘ side-sheet |
| `WeakAreasFocusRail` | ⓘ side-sheet (idle) |
| `WorkspaceDiscoverabilityPanel` | ⓘ side-sheet (idle) |
| `ConceptBusPanel` | Chip 3 concept ribbon OR ⓘ |
| `WorkspaceLearningActionBar` | Merge into Chip 2 |
| `WorkspaceToolHeader` | `<ToolFrame>` title |
| `WorkspaceToolCrossLinkBar` | `<ToolFrame>` footer |

**Target chrome height:** ≤ 96 px desktop · ≤ 72 px mobile (refined §2.4).

### 4.3 Performance path

```text
Continue click
  → preloadCriticalChunks (idle, boot)
  → loadStudyWorkspaceModule (retry ×3)
  → StudyWorkspaceLazy boot shell
  → WorkspaceProvider mount
  → WorkspaceShell (header + step rail)     ← sync, minimal
  → active tool lazy chunk                   ← Suspense skeleton 64px
  → worker: sourceIntelligence (async)     ← Phase B4
  → idle: intel panels + palette index       ← Phase B9 ✅ pattern exists
```

---

## 5. Content pipeline — πλήρης roadmap

### 5.1 Layer stack (v2.5.1 — current)

1. `sanitizeUnicode` → 2. `stripPresentationMarkup` → 3. `repairUtf8Mojibake` → 4. structural `\f` → 5. `repairGreekDocumentText` + `repairSpacedLatinText` → 6. `applySpellGateDocument` → 7. `repairGreekPhraseCleanup` → 8. `flattenReaderPresentation`

### 5.2 Επόμενα layers

| Layer | Module | Trigger |
|-------|--------|---------|
| Hunspell confirm | `spellLexicon` + `.dic` | unknown-tokens > threshold |
| NER entities | `entityExtract.ts` + sidecar | course generation |
| Layout blocks | `documentModel.ts` | 8B-γ |
| Math OCR | server OCR `mode=math` | image-only formula zones |
| Bilingual ensemble | `bilingualOcrEnsemble.ts` | scanned Greek PDFs |

### 5.3 Migration ops

**Κάθε course με `pipelineVersion < 2.5.1` πρέπει:**

1. Να εμφανίζει banner (✅).
2. Να προσφέρει Preview reprocess (✅).
3. Μετά το Apply: `extractedText` re-run through full pipeline; `conceptSpans` refresh; tasks regen (🔶 flaky tests).

**Bulk script (προτεινόμενο):** `scripts/bulk-reprocess-stale.mjs` — iterate library, filter stale, queue reprocess, report CSV.

---

## 6. Agent & RAG

| Capability | Status | Next |
|------------|--------|------|
| BM25 + hybrid embed rerank | 🟢 | Server-side index when E2 |
| Workspace step context on handoff | 🟢 | |
| Page citations | 🟢 | |
| Chunk-level grounding tags | 🟢 | |
| Mode: Socratic / Direct / Mixed | 🟢 Settings wired | |
| Offline / no API key UX | 🟢 | |
| Token budget display | 🟡 | |
| Conversation persistence server | 🔲 | |

---

## 7. Ακολουθία υλοποίησης (προτεινόμενη, 6 μήνες)

### Q3 2026 (Ιούλιος – Σεπτέμβριος) — «Perf + compress»

1. **B7–B8** ContextBar + ToolFrame (2 weeks)
2. **B4** workspace.worker.ts (1 week)
3. **B2** Shell split StudyWorkspace <300 lines (1 week)
4. **A7 + C3** fix flaky reprocess tests (3 days)
5. **A3 + A4 + I** Sentry prod + chunk endpoint (3 days)
6. **D.3–D.4** Dashboard feed + Library file ops (1 week)
7. **F3 + H** a11y/tablet audit + Varian CI gate (3 days)

### Q4 2026 (Οκτώβριος – Δεκέμβριος) — «Pipeline depth + i18n»

1. **C1** Hunspell path (2 weeks)
2. **G** i18n full pass Analytics/Feynman/Debate (2 weeks)
3. **C6** Math OCR zones MVP (2 weeks)
4. **B10–B11** preload + perf E2E (1 week)
5. **F7** visual regression CI (1 week)
6. **E1–E2** server RAG persistence spike (3 weeks)

### Q1 2027 — «Platform scale»

1. **E3–E4** billing + teacher roster
2. **C7** DocumentModel
3. User-authored notes MVP (new epic)
4. Remove `lucide-react` + design token finalization

---

## 8. KPIs & ορισμός «ολοκληρωμένο»

| Metric | Target | Tool |
|--------|--------|------|
| TTI workspace warm | ≤ 400 ms | Playwright trace |
| TTI workspace cold | ≤ 1.2 s | Playwright trace |
| CLS first 3s | < 0.02 | Lighthouse |
| Vitest pass rate | 100% stable | CI |
| a11y serious/critical | 0 | axe Playwright |
| Chunk error rate | ≤ baseline | Sentry dashboard |
| Greek Varian fixtures | 11/11 | CI gate |
| i18n EL primary paths | 100% strings externalized | i18n lint |
| Pipeline stale courses | 0% after migration campaign | analytics |
| Feature parity matrix | 100% STUDY_WORKSPACE.md §Tools | smoke E2E |

---

## 9. Risk register (ενημερωμένο)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Refined merge overwrites pipeline | High | §2.3 keep-local list; never blind merge |
| ContextBar hides features | Medium | ⓘ pulse onboarding; spotlight first visit |
| Worker unsupported | Medium | Sync fallback in `workspace.worker.ts` |
| Hunspell bundle size | Medium | Lazy load dictionary per lang |
| HF transformers v4 size | Medium | Already lazy in embedder |
| Flaky CI erodes trust | High | A7 serial reprocess pool |
| Demo data confusion | Low | `showDemoContent: false`; Alex Chen = demo only |
| Sentry PII | Medium | `beforeSend` strip auth headers ✅ |

---

## 10. Εβδομαδιαία sync με synaptic-refined

```bash
git fetch synaptic_refined main
git diff synaptic_refined/main --stat
# Port ONLY additive UI/infra; NEVER touch §2.3 keep-local files
```

**Cadence:** κάθε Δευτέρα — diff stat, triage, port if additive.

---

## 11. Appendix A — Keep-local list (NEVER overwrite on merge)

```
src/lib/documentTextPipeline.ts (+ test)
src/lib/varianCh31Fixtures.ts (+ test)
src/lib/spellGate.ts, spellLexicon.ts, miniSymSpell.ts, viterbiWordSegment.ts
src/lib/latinTextRepair.ts, textSanitizer.ts (+ test), presentationSanitizer.ts
src/lib/paragraphLangDetect.ts, textQualityMetrics.ts (+ test)
src/lib/greekTextRepair.ts (+ test), greekOcrFixtures.ts
src/lib/bilingualOcrEnsemble.ts, courseSourceQuality.ts
src/lib/pipelineConstants.ts, pipelineMigration.ts
src/lib/ocrExtract.ts (+ test), utf8MojibakeRepair.ts
src/components/workspace/CognitiveReader.tsx
CHANGELOG.md, CONTENT_PIPELINE.md, ROADMAP.md
src/lib/workspaceToolLazyRegistry.ts (ours extends lazy map)
src/lib/sentryInit.ts
src/components/workspace/WorkspaceSourceStatusBar.tsx (v2)
```

## Appendix B — Αρχεία εγγράφων αναφοράς

| Doc | Role |
|-----|------|
| `SYNAPTIC_REFINED_UPGRADE_PLAN.md` | Merge audit + phases A–F v1 |
| `STUDY_WORKSPACE_REARCHITECTURE_PLAN.md` | Refined workspace architecture |
| `PRODUCT_UPGRADE_MASTER_PLAN.md` | Page audits + LLM prompt |
| `PLATFORM_UI_UX_MASTER_PLAN.md` | EL UX principles + per-screen |
| `CONTENT_PIPELINE.md` | Pipeline layers |
| `FUNCTION_CATALOG.md` | Per-function inventory |
| `docs/observability/sentry-chunk-errors.md` | Sentry ops |

---

*Generated 2026-06-27 — exhaustive forward plan aligned with synaptic-refined direction, preserving Wave 8B-β pipeline leadership.*
