# Roadmap & Gap Analysis

**Status baseline:** June 2026 — post P0/P1/P2 sweep plus June wave: Study Workspace stability fixes, Agent workspace handoff (auto-send + step RAG context), mobile intelligence tabs, OCR line correction MVP, pipeline **v2.4.0** (column-major PDF + lecture merge tuning), library delete/reprocess, Greek OCR v2.3 repair path.

This document separates **done**, **partial**, and **missing** against the product goal: *note-grounded adaptive learning at product scale, not MVP/demo-first.*

---

## Executive summary

| Layer | Completion | Notes |
| ----- | ---------- | ----- |
| Content engine (offline v2) | **~90%** | RAKE+TextRank, sections, prerequisites, BM25 unified across deterministic tools, PMI co-occurrence edges |
| Upload → course pipeline | **~90%** | PDF/DOCX/PPTX/TXT/MD/CSV + YouTube transcript + OCR for images/scanned PDFs are live, with course-level source-quality scoring and adaptive topic compaction before study |
| Study Workspace (11 tools) | **~88%** | Note-grounded, scoped persistence, mobile tool drawer + intelligence tabs, learning-action Agent handoff, context strip; upload lands on course review before workspace |
| Lesson surfaces | **~80%** | LessonView + PracticalLessonView fully note/LLM-grounded |
| Tasks & pedagogy | **~80%** | Generated tasks, FSRS→store, Beta-Bernoulli mastery, course-derived prereq edges |
| Analytics & Dashboard | **~75%** | Mastery map now derived from real `learnerModel + courses`; some metric depth still partial |
| RAG / Agent | **~85%** | BM25 + hybrid embedding rerank; workspace step/course context on handoff; chunk-level page citations after PDF `\f` fix |
| Client persistence | **~85%** | localStorage + IndexedDB + backup; whiteboard/scratchpad/concept-map scoped per task |
| Auth & full sync | **~80%** | JWT login/register, library + session pull/push, plan refresh, identity isolation |
| Phase 6 server | **~75%** (dev skeleton) | Express proxy + auth + sync + OCR/RAG routes ship locally; **not** hardened multi-tenant production (see `server/README.md`) |
| Documentation | **~90%** | 11 MD files + new SECURITY/API/CHANGELOG/ALGORITHMS docs + `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md` |
| Tests & CI | **~85%** | Vitest: **335+** unit tests; Playwright E2E (2 specs); server integration tests still missing |
| i18n | **~35%** | Shell + onboarding EL; analytics/feynman/argument labels still EN-only |

**Overall product-scale readiness: ~84%** — past the MVP boundary; remaining work is depth (offline embeddings, full i18n, multi-user collaboration) rather than core workflow gaps.

### Reader / pipeline v2.4.0 — **complete** (June 2026)

| Capability | Module | Status |
| ---------- | ------ | ------ |
| Column-major multi-column PDF reading order | `pdfExtract.ts` | ✅ |
| Lecture merge threshold tuning (2+ lectures) | `sectionMerger.ts` | ✅ |
| Greek OCR repair (reprocess path) | `greekTextRepair.ts` v2.3 | ✅ |
| Reader OCR line correction (local) | `readerOcrCorrectionStore.ts`, `OcrCorrectionPanel.tsx` | ✅ MVP |
| Agent auto-send + workspace RAG context | `agentWorkspaceContext.ts`, `Agent.tsx` | ✅ |
| Mobile intelligence tabs | `WorkspaceMobileIntelligenceTabs.tsx` | ✅ |

**Re-upload / reprocess:** courses analyzed before **v2.4.0** keep stored `extractedText`. Use **re-upload** for full Reader v2.4 layout, or **Επανεπεξεργασία κειμένου** when `pipelineVersion < 2.4.0` for Greek repair + merge without re-uploading the file.

### Launch phases A–E (June 2026) — **complete**

| Phase | Deliverable | Key files |
| ----- | ----------- | --------- |
| A | Lesson rail + Reader structure from real headings | `textSegmentation.ts`, `readerDocumentLayout.ts`, `noteContentExtractors.ts` |
| B | Outline preview before generate | `uploadOutlinePreview.ts`, `OutlinePreviewPanel.tsx` |
| C | Concept Bus panel (term ↔ tool activity) | `ConceptBusPanel.tsx`, `conceptBusPanelModel.ts` |
| D | Upload success toast | `uploadStructureSummary.ts`, `AppToastBanner.tsx` |
| E | Eval harness recall ≥ 0.6 | `evalHarness.ts`, `collectPipelineConcepts()` |

See **`FUNCTION_CATALOG.md`** for the exhaustive per-function inventory and upgrade waves.

### Reader recognition Wave 1 — **complete** (pipeline v2.2.0)

| Capability | Module | Status |
| ---------- | ------ | ------ |
| Front-matter card (`Στοιχεία μαθήματος`) | `readerDocumentLayout.ts`, `FrontMatterCard.tsx` | ✅ |
| Ordered syllabus lists (`<ol>`) | `readerDocumentLayout.ts`, `detectEnumeratedItems` | ✅ |
| Adaptive paragraph reconstruction | `readerDocumentLayout.ts` | ✅ |
| Page → lecture merge | `sectionMerger.ts` | ✅ |
| Lecture-only Reader nav | `readerSectionNav.ts` | ✅ |
| Tables / multi-column PDF | `readerTableLayout.ts` | ✅ |
| Bibliography blocks | `readerBibliography.ts`, `BibliographyBlock.tsx` | ✅ |
| LaTeX / math preservation | `readerMathBlocks.ts`, KaTeX in `CognitiveReader` | ✅ |
| OCR default for image-only PDFs | `ocrExtract.ts` (`isImageOnlyPdf`, `needsOcr`) | ✅ |
| Re-upload migration hint | `pipelineMigration.ts`, `ReuploadMigrationBanner.tsx` | ✅ |
| Greek syllabus acceptance harness | `readerGreekSyllabus.test.ts` | ✅ |

**Re-upload required:** courses analyzed before v2.2.0 keep stored `extractedText` and segments from the old pipeline. The UI shows a dismissible re-upload banner; users must **re-upload** (or extend-upload) the PDF for improved Reader output.

---

## 1. Completed (stable)

### Content & pipeline
- `contentAnalysis.ts` v2 — segmentation, RAKE+TextRank, definitions, prerequisite inference, LexRank-lite summarization
- `processUpload()` — extract → LLM or offline outline → course → tasks → skill nodes
- `courseSourceQuality.ts` — course-level quality signals, warnings, recommended topic budget, and adaptive outline compaction upstream of course creation
- `mergeOutlineIntoCourse()` — incremental extend mode
- `youtubeCaptions.ts` (server) + `youtubeTranscript.ts` (client) — full caption fetch including manual/ASR track selection and json3/XML parsing
- `formulaSolver.ts` — generic shunting-yard evaluator with `sin/cos/tan/log/ln/exp/sqrt/abs/round/floor/ceil/min/max`, `pi`/`e` constants, unary minus/plus, scientific notation; **14 unit tests**
- `pdfExtract.ts` — page boundaries serialized as `\f` so the RAG chunker can attach `p.X` citations
- BM25 unification — `noteContentExtractors.relevantExcerpt` and `topRelevantChunks` now retrieve through the same corpus the Agent uses
- PMI-based co-occurrence edges in concept map (sliding-sentence window, log-PMI > 0 filter)
- Distractor ranking — near-miss glossary picks via term-Jaccard + length similarity instead of "first 3"

### Study Workspace
- `workspaceNoteContent.ts` — 11-tool bundle, `hasSource` gate
- `sourceIntelligence` — bundle-level grounding score, tool recommendation, gaps, and next-action hints for the active concept
- Section-aware steps (`buildWorkspaceStepsFromNotes`)
- Leitner → `submitLeitnerRating` → FSRS/mastery in store
- Concept map co-occurrence edges from source text
- **Mobile stacking** — `<md` viewports run single-pane with a swap toggle
- **Full keyboard surface** — `1-0` switch tool, `L/T/S` layout focus, `N` notes, `?` overlay (overlay now documents 8 bindings)
- **Scoped persistence** — whiteboard, scratchpad, concept-map positions all keyed per task (`progressKey`); legacy global key migrated on first run
- Subject-agnostic Feynman rubric — `accuracy` derives from concept + reference notes + glossary
- Empty states + upload CTA (no demo when empty)

### Surfaces & identity
- `LessonView.tsx` — note-grounded via `GroundedLessonContent` + LLM panels
- `PracticalLessonView.tsx` — exercises derived from notes, no demo stubs
- `CourseView` review landing — post-upload generation diagnostics, topic-density review, and “Add Material” path before Study Workspace
- `Analytics` Mastery Map — built from `learnerModel + courses`, not hardcoded econ graph
- `buildInitialUser()` — production users start as a clean `Learner` identity (auth/onboarding populates name/email); `Alex Chen / Level 7` only appears with `showDemoContent: true`
- Layout: full-width pages, Shell `lg:ml-64`
- Demo isolation: `showDemoContent: false` default, `visibleCourses()` filter, `INITIAL_MISTAKES` lives in `src/demo/`

### RAG / Agent
- `rag.ts`, `sourceContext.ts` — BM25, optional embedding rerank, citations with real page numbers (after `\f` fix)
- `tokenize()` shared between RAG and content tools

### Persistence & sync
- `synapse:library-v1`, `synapse:session-v2`, IndexedDB for large text
- Auto-pull library + session on login
- Server `DATABASE_URL` → Postgres `accounts`, `account_libraries`, `account_sessions` (managed by `node-pg-migrate`)

### Backend (Phase 6)
- Express OpenAI-compatible proxy (`/v1/chat/completions`, `/v1/embeddings`)
- JWT `/auth/register`, `/auth/login`, `/auth/me`
- `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`
- Usage metering + plan-aware quotas (`free` / `pro` / `team`)
- Sliding-window `/v1/*` rate limiting
- `/v1/library` GET/PUT, `/v1/session` GET/PUT
- `/v1/youtube/transcript` (CORS-bypassing transcript proxy)
- `/v1/nlp/entities`, `/v1/rag/query`, `/v1/ocr/pages`, `/v1/teacher/dashboard`
- `/v1/billing/checkout`, `/v1/billing/status`, `/v1/billing/webhook` (real Stripe)
- `/v1/admin/stats` gated by `ADMIN_SECRET`
- Postgres migrations (`node-pg-migrate`) — `npm run migrate` + optional `RUN_MIGRATIONS_ON_START`

### Build & quality
- Code-split Vite build (~281 KB main entry vs former ~8.6 MB monolith)
- `npm run typecheck:all` gates client + server before build
- CI: client typecheck + test + build; server typecheck
- Vitest test suite: 12 files / 59 unit tests across content analysis, provenance, clustering, OCR, entities, course source quality, quiz extraction, upload fallback, retention, formula solving, and workspace source intelligence
- Playwright `e2e/youtube-upload.spec.ts` + `e2e/file-upload-workspace.spec.ts` (run with `npm run test:e2e`; not yet in CI)

### Documentation (current)
| File | Covers |
| ---- | ------ |
| `README.md` | Quick start, scripts, persistence summary |
| `ARCHITECTURE.md` | Data flow, modules, server seam |
| `CONTENT_PIPELINE.md` | Offline + LLM, source modes, transcript ingestion |
| `STUDY_WORKSPACE.md` | 11 tools, persistence keys, shortcuts |
| `AGENT_RAG.md` | Retrieval, BM25 + hybrid rerank, Agent flow |
| `PERSISTENCE.md` | Keys, IndexedDB, backup, server sync |
| `DEPLOYMENT.md` | Frontend, proxy, Postgres, Stripe, migrations |
| `TESTING.md` | Vitest, Playwright, CI |
| `I18N.md` | Coverage matrix, hardcoded English list |
| `ROADMAP.md` | This file |
| `server/README.md` | Endpoints, auth, metering, migrations |
| `SECURITY.md` *(new)* | Threat model, JWT, Stripe webhook verification, `ADMIN_SECRET` semantics |
| `API.md` *(new)* | Authoritative `/auth/*` + `/v1/*` reference |
| `ALGORITHMS.md` *(new)* | RAKE+TextRank, BM25, PMI edges, FSRS, formula solver internals |
| `CHANGELOG.md` *(new)* | Versioned shipping log |
| `CONTRIBUTING.md` *(new)* | Local dev, branch convention, gates, doc-maintenance checklist |
| `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md` *(new)* | Product-scale audit + canonical plan for every page, tool, algorithm, and backend surface |

---

## 2. Demo isolation — clean

After the recent sweep, no demo concept (Cournot/Bertrand/Elasticity/Pandas/Microeconomics) reaches the production user path:

| Path | State |
| ---- | ----- |
| `mockUser` identity | Gated: production users start as `Learner` and pick up name from auth/onboarding |
| Analytics Mastery Map | Derived from `learnerModel + courses`; no hardcoded econ graph |
| `feynmanRubric.computeRubric` | Subject-agnostic via `RubricContext` (concept + glossary + notes) |
| Prerequisite repairs | Source from `Course.topic.prerequisites`; `ECON_CONCEPT_EDGES` only when `showDemoContent: true` |
| `data/mockData.ts` shim | **Removed** |
| `SupplyDemandDiagram` | **Removed** (was unused) |
| `marketStructures` / `microeconomics` i18n keys | **Removed** (were unused) |
| `INITIAL_MISTAKES` | Moved to `src/demo/mockData.ts` (`DEMO_INITIAL_MISTAKES`) |
| `StudyWorkspace` default `quizConcept` | First course topic title (or course title); never hardcoded demo labels |

---

## 3. Remaining algorithm depth (P1.5)

| Gap | Current | Target |
| --- | ------- | ------ |
| Local embeddings | Server-side via `/v1/embeddings` (proxy/key required) | Optional local model (transformers.js / WASM) |
| Audio / richer OCR modes | OCR for scanned PDFs + images ships today | Whisper ingestion, handwriting support, math OCR, richer figure extraction |
| Worked examples | Section-aware paragraph picks | Step-by-step problem mining + scaffolded variants |
| Compare detection | Pattern + glossary | Markdown/HTML table mining + diff highlighting |
| Multi-turn debate | Static argument tree | Counter-argument generation via LLM with note grounding |
| Grounding verification | Source-cited prompts | Numeric span check between LLM output and chunk text |

---

## 4. Remaining UI/UX depth (P2)

| Gap | Status |
| --- | ------ |
| Concept map editing (add node / draw edge / delete) | Drag/zoom only; no edit affordances yet |
| Whiteboard pro features (image import, LaTeX render, shape select) | Drawing + text + formula label; no LaTeX render |
| Reader TTS + dyslexia font + click-to-define | Bionic + complexity heatmap; no TTS yet |
| Comparison interactive (sort/diff/CSV export) | Animated read-only render |
| Annotation sub-line text selection | Whole-line highlights only |
| A11y on SVG/canvas (aria, role, keyboard focus) | Limited; reduced-motion respected only in some flows |
| Cross-tool deep links (map → reader scroll, scratchpad → whiteboard render) | Feynman → map switch only |

---

## 5. Backend Phase 6 — current vs remaining

**Already shipped:**

| Done | Remaining |
| ---- | --------- |
| Express OpenAI-compatible proxy | Email verification / OAuth / account lifecycle polish |
| JWT `/auth/*` + refresh / forgot / reset tokens | Server-side persistent RAG index (pgvector, post-sync) |
| Usage metering + plan-aware quotas | Distributed / Redis-backed rate limiting + structured audit logs |
| `/v1/library` GET/PUT | Class management / teacher dashboard UI |
| `/v1/session` GET/PUT | TLS deploy guide + Helm/Compose example |
| `/v1/youtube/transcript` | Offline embedding model option (transformers.js) |
| `/v1/ocr/pages` (scanned PDF / image) | Handwriting OCR, math OCR, richer figure extraction |
| `/v1/nlp/entities` | Deeper entity typing / linking |
| `/v1/rag/query` (semantic over client chunks) | Persistent server-side hybrid retrieval |
| `/v1/teacher/dashboard` (aggregate endpoint) | Multi-tenant org accounts + full teacher UI |
| `/v1/*` sliding-window rate limiting | Distributed Redis rate limiting for multi-replica |
| Stripe checkout + webhook + status |  |
| Admin stats endpoint | Collaborative whiteboard / annotations |
| Postgres `accounts`/`account_libraries`/`account_sessions` via `node-pg-migrate` | |

---

## 6. Phase ordering — current state

### Phase P0 — **done**
- [x] Mock isolation (`demoMode.ts` + `src/demo/`)
- [x] LessonView + PracticalLessonView note-grounded rewrites
- [x] `processUpload` only in App default path
- [x] Tasks from course, real activity heatmap/streak
- [x] Purge demo from production fallbacks (Analytics, identity, Feynman, prereq edges)

### Phase P0 correctness — **done**
- [x] `formulaSolver`: real `sin/cos/log/sqrt`, signed numbers, units, scientific notation
- [x] `pdfExtract`: `\f` page joining so citations resolve to `p.X`
- [x] `skillNodes`: token-Jaccard `isSameConcept` replaces `slice(0, 8)` collisions

### Phase P1 — **done**
- [x] Section-aware lesson steps
- [x] Cloze quiz with near-miss distractors
- [x] BM25-unified concept extractors
- [x] Concept map PMI co-occurrence edges
- [x] Leitner → store FSRS
- [x] IndexedDB large uploads
- [x] Client auth + library + session sync
- [x] YouTube transcript pipeline (server + client)
- [x] Generic formula solver
- [x] Whiteboard ↔ notes (formula insert)
- [x] Workspace mobile stacking + full keyboard surface
- [x] Scoped persistence per workspace task

### Phase P2 — **partly done, partly future**
- [x] Server session sync
- [x] Stripe + admin
- [x] Postgres + node-pg-migrate
- [x] Playwright E2E (5 specs: upload→workspace, reader-step-sync, greek-syllabus, workspace-deep-links, youtube-upload; CI integration pending)
- [x] OCR for scanned PDFs / images
- [x] Server NLP entities endpoint
- [x] Server semantic RAG endpoint (`/v1/rag/query`)
- [x] Server teacher dashboard aggregate endpoint
- [x] Built-in `/v1/*` rate limiting + refresh/reset token flows
- [ ] Offline embeddings model (transformers.js)
- [ ] Full i18n (Analytics, Feynman, Argument labels still EN)
- [ ] Collaborative annotations / whiteboard
- [ ] Class / teacher dashboard UI
- [ ] Audio / Whisper transcription, handwriting OCR, math OCR

---

## 7. TypeScript & build gates

- `npm run typecheck` — client strict mode ✅ **0 errors**
- `npm run typecheck:all` — client + server ✅
- `npm run build` — runs `typecheck:all` then Vite build ✅
- `npm test` — Vitest (**335+** unit tests) ✅
- `npm run test:e2e` — Playwright (5 specs) ✅ (not yet wired to CI)
- CI runs client typecheck/test/build + server typecheck

Previously reported latent issues (`navItems`, `studyTimeWeek`, duplicate imports) remain **resolved** — `tsc --noEmit` is the build gate.

---

## 8. Doc maintenance checklist

When changing behavior, update:

1. `ARCHITECTURE.md` — module map
2. `CONTENT_PIPELINE.md` — algorithm changes
3. `STUDY_WORKSPACE.md` — tool I/O
4. `ALGORITHMS.md` — algorithm internals (new file)
5. `API.md` — endpoint changes (new file)
6. `SECURITY.md` — auth/billing/secret changes (new file)
7. `CHANGELOG.md` — append release entry
8. `ROADMAP.md` — this file
9. `TESTING.md` — new test commands

---

See also: [ARCHITECTURE.md](ARCHITECTURE.md), [DEPLOYMENT.md](DEPLOYMENT.md), [TESTING.md](TESTING.md), [AGENT_RAG.md](AGENT_RAG.md), [SECURITY.md](SECURITY.md), [API.md](API.md), [ALGORITHMS.md](ALGORITHMS.md), [CHANGELOG.md](CHANGELOG.md), [CONTRIBUTING.md](CONTRIBUTING.md).
