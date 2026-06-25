# Changelog

Notable changes to Synapse Learning. Dates use ISO format. Until 1.0, the
client and server are versioned together.

## [Unreleased]

### Added

- **Pipeline P0 — table + math blocks in segmentation path (`a4d5dff`)**
  - `segmentationEmbeddedBlocks.ts` — shared `collectEmbeddedBlocks` /
    `splitTextWithEmbeddedBlocks` for `textSegmentation` and Reader layout.
  - `detectDocumentSections()` emits `boundaryKind: 'table' | 'math'` with
    `ExtractedTable` / `mathLatex` metadata; `expandDocumentSectionsWithEmbeddedBlocks`.
  - `readerDocumentLayout.ts` refactored to use the same splitter (no duplicate logic).
  - **Tests:** `segmentationEmbeddedBlocks.test.ts` (5 cases + integration with
    `detectDocumentSections`).
- **Launch Wave 8A — Study Workspace Phase 2 UI (`49afe23`)**
  - **SW-P2-05:** Structured workspace context JSON on every Agent open —
    `toAgentWorkspaceContextJson`, `buildAgentContextSystemBlock` in
    `agentWorkspaceContext.ts`; collapsible JSON in `AgentContextBanner`; injected
    into Agent LLM stream metadata.
  - **SW-P2-06:** `ConceptLensPanel` `placement="strip"` on `< lg` — inline under
    context strip (collapsed by default); desktop keeps floating overlay.
  - **SW-P3-08:** `WorkspaceKeyboardHelp` overlay (`?`) with EL/EN labels;
    `workspaceKeyboardShortcuts.ts` wires documented shortcuts (`Esc`, `⌘K`,
    `←/→`, `1–0`, `L/T/S`, `N`) in `StudyWorkspace`.
  - **SW-P2-07:** WCAG AA contrast token pass — dark/light `text-secondary`,
    `text-tertiary`, `text-muted` in `index.css`.
  - **Tests:** `agentWorkspaceContext.test.ts`, `workspaceKeyboardShortcuts.test.ts`,
    `WorkspaceKeyboardHelp.test.tsx`.
- **Launch Wave 7 — Study Workspace Phase 2 UI (`552d0ef`)**
  - **SW-07:** `lessonStepToolbarNextActionSync` wires `LessonStepToolBar` to
    `nextActionEngine` recommendations.
  - **SW-P1-02:** `WorkspaceMobileToolDrawer` — bottom sheet with clustered tools
    on mobile (`lg:hidden`); fixed bottom bar shows active tool.
  - **SW-P1-04:** Bidirectional reader↔step sync via `readerStepSyncBridge` +
    `readerStepSyncP104QA` (section nav ↔ lesson step rail).
  - **SW-P1-03:** Unified lesson action row on `LessonStepToolBar` — Study / Test /
    Explain / Agent (`lessonStepUnifiedActions.ts`); highlights `nextActionEngine` match.
  - **Typography / encoding:** `utf8MojibakeRepair.ts` (pipeline + reader display);
    Noto Sans + Noto Sans Greek fonts; `.reader-prose` class for EL+EN long-form text.
  - **Tests:** `WorkspaceMobileToolDrawer.test.tsx`, `utf8MojibakeRepair.test.ts`,
    `lessonStepUnifiedActions.test.ts`, `LessonStepToolBar.test.tsx`.
- **Upload outline preview (Phase B)** — `uploadOutlinePreview.ts` +
  `OutlinePreviewPanel`: client-side text extraction on the configure step shows
  detected sections, proposed modules, and source-quality score **before**
  Generate Course. Course Library file rows expand to the same compact preview
  from stored `extractedText`.
- **Concept Bus panel (Phase C)** — `ConceptBusPanel` + `conceptBusPanelModel`:
  visible term ↔ tool activity correlation in Study Workspace (chips + expandable
  rows with signals and one-click tool jumps).
- **Upload success toast (Phase D)** — `uploadStructureSummary.ts` +
  `AppToastBanner`: after generate, toast shows «X conversations, Y sections
  detected» (or sections-only for non-chat sources).
- **Eval harness (Phase E)** — `collectPipelineConcepts()` unions outline topics,
  glossary, definitions, sections, and keyphrases; pass gate raised to concept
  recall ≥ 0.6 on physics/law fixtures.
- **Reader layout v2 (recognition hardening)** — `readerDocumentLayout.ts`:
  adaptive wrap-width paragraph reconstruction; enumerated syllabus detection
  (`1 ΕΘΝΙΚΟ …` without dot); multi-line list items (`whitespace-pre-line`);
  front-matter heading inference (no generic `Introduction` when syllabus rows
  detected); `documentStructureReport` prefers `headings` over `slides` when
  lecture titles are inferred across PDF pages.
- **Section merger + front-matter UX** — `sectionMerger.ts` collapses
  page-per-PDF sections into lecture units; `FrontMatterCard` + ordered `<ol>`
  syllabus lists; sticky `workspace-intelligence-rail` (Discoverability +
  Concept Bus); **`FUNCTION_CATALOG.md`** master function inventory + upgrade
  waves; `ROADMAP.md` / `PRODUCT_SCALE_PLAN.md` synced with phases A–E.
- **Reader section nav (lectures only)** — `readerSectionNav.ts` filters
  horizontal nav chips to merged ΔΙΑΛΕΞΗ headings (not per-page §N); rail label
  «Διαλέξεις» when all chips are lectures; `documentStructureReport` uses the
  same filter for Source Intelligence chips.
- **Lesson rail ↔ Reader scroll sync** — `readerStepSync.ts` maps workspace
  steps to reader heading segments (title match + ordinal fallback); rail click
  opens Reader and scrolls; Reader section nav updates the active lesson step.
- **Weak areas → workspace focus** — `workspaceWeakAreas.ts` +
  `WeakAreasFocusRail`: Dashboard weak-area clicks and in-workspace chips set
  focus term + reader highlight; opens Reader and jumps to matching lesson step.
- **Reader tables / multi-column PDF** — `readerTableLayout.ts` detects
  fixed-gutter column blocks and repairs interleaved two-column PDF text;
  `buildReaderSegments` emits `table` segments; Cognitive Reader renders
  structured `<table>` (Markdown + aligned columns).
- **Reader bibliography blocks** — `readerBibliography.ts` detects
  Βιβλιογραφία/References headings, bracket-numbered refs, and author-year
  citation runs; `BibliographyBlock` card in Cognitive Reader with folded
  multi-line entries.
- **Reader LaTeX / math blocks** — `readerMathBlocks.ts` preserves `$$…$$`,
  `\[…\]`, and `\\begin{…}` display math before paragraph flow; inline
  `$…$` / `\\(…\\)` paragraphs render via KaTeX (`RichText`); display
  equations use `FormulaLatexPreview`; `isMathLikeLine` stops false section
  splits on equation lines.
- **OCR default for image-only PDFs** — `isImageOnlyPdf` + stricter `needsOcr`
  per-page density; scanned PDFs skip the empty text layer and run OCR
  immediately; `ingestMethod` records `ocr-server` / `ocr-client`.
- **Re-upload migration hint** — `pipelineMigration.ts` + `ReuploadMigrationBanner`
  in Course view and Study Workspace when `pipelineVersion` &lt; v2.2.0;
  pipeline bumped to **2.2.0** (Wave 1 recognition).
- **ChatGPT JSON/ZIP import** — `chatGptImport.ts` parses OpenAI exports, injects
  `User:` / `Assistant:` labels before segmentation, sets `ingestMethod:
  'chatgpt-export'`. Upload modal accepts `.json` / `.zip`; structure surfaces in
  Source Intelligence + Reader section rail.
- **Document structure report** — `documentStructureReport.ts` +
  `SourceIntelligenceCard` section chips; `CognitiveReader` horizontal section nav
  with scroll-to-heading.
- **Segmentation v3** — unified `textSegmentation.ts` (headings, slides, Q&A turns,
  dialogue, date blocks, code-fence awareness) wired through content analysis, RAG,
  lesson steps, and reader paragraph splits.
- **TypeScript build gate** — `npm run build` runs `typecheck:all` first; fixed
  latent errors (`ingestMethod` on extract pipeline, SourceIntelligenceCard `??`/`||`).
- **Concept bus backend sync** — `conceptBuses` and `stepSchedules` travel through
  `GET/PUT /v1/session` (JSONB-safe additive fields). Client merge via
  `conceptBusSync.ts`; pull enriches `weakAreas`, `spacingIntervals`, and
  `reviewsDue` from cross-tool struggle + spaced step due counts.
  and quick actions above the tool pane (`WorkspaceDiscoverabilityPanel`,
  `workspaceDiscoverability.ts`).
- **W8 — Quiz session** — multi-item flow with 1–5 confidence rating and per-task
  persistence (`quizSession.ts`, `WorkspaceQuizSession`).
- **W8 — Feynman** — speech-to-text input and rubric-based auto-gap detection with
  Reader deep-links (`feynmanVoice.ts`, `feynmanGapDetect.ts`).
- **W8 — Debate** — interactive rebuttal graph from claim tree (`debateRebuttalGraph.ts`).
- **W8 — Concept map** — collaborative cursor overlay via SSE
  (`conceptMapCursorSync.ts`, `POST/GET /v1/concept-map/cursors`).
- **W8 — Reader** — OCR overlay regions for scanned uploads (`readerOcrOverlay.ts`).

### Added (prior unreleased batches W4–W7)

- **Phase W4–W7 workspace upgrades** — bilingual reader sync, compare sort/diff/CSV,
  whiteboard layers + LaTeX stamps, Feynman rubric export, debate counter-args,
  spaced scheduling, annotation SSE, Leitner heatmap, scratchpad graph, timer .ics,
  quiz IRT, sandbox sensitivity heatmap, command palette macros.

### Added

- **Documentation sweep** — new `API.md`, `ALGORITHMS.md`, `SECURITY.md`,
  `CONTRIBUTING.md`, `CHANGELOG.md`, `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md`.
  Existing docs (`ROADMAP.md`, `ARCHITECTURE.md`, `CONTENT_PIPELINE.md`,
  `PERSISTENCE.md`, `DEPLOYMENT.md`, `TESTING.md`, `STUDY_WORKSPACE.md`,
  `server/README.md`) updated to match shipped behavior.
- **Server OCR endpoint** — `POST /v1/ocr/pages` (Tesseract over client-rendered page images) for scanned PDFs and image uploads.
- **Server NLP entities endpoint** — `POST /v1/nlp/entities` for hybrid rule + LLM entity extraction.
- **Server semantic RAG endpoint** — `POST /v1/rag/query` for cosine-ranked retrieval over client-supplied chunks.
- **Server teacher dashboard endpoint** — `GET /v1/teacher/dashboard` for course/file/topic + usage aggregates.
- **Server refresh / password-reset tokens** — `POST /auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` with hashed, revocable, TTL-bound tokens.
- **Server rate limiting** — sliding-window per-account/IP RPM cap on `/v1/*` routes.
- **`src/lib/identity.ts`** — production-safe user identity helper
  (`buildInitialUser`, `applyAuthIdentity`, `levelFromXp`,
  `nameFromEmail`).
- **`src/lib/conceptEdges.ts`** — derive prerequisite edges from generated
  course topics; replaces hardcoded `ECON_CONCEPT_EDGES` on the production
  path.
- **`src/lib/formulaSolver.test.ts`** — 14 Vitest cases covering arithmetic,
  unary minus, scientific notation, trig/log/sqrt, constants, and error
  paths.
- **`src/lib/noteContentExtractors.test.ts`** — 7 Vitest cases covering
  Markdown-table comparison parsing, quiz `correctIndex` correctness,
  deterministic option ordering, distinct correct positions across
  concepts, and near-miss distractor ranking.
- **`src/lib/contentAnalysis.test.ts`** — extended with biased-TextRank,
  MMR redundancy filtering, and Bloom-aware objective tests (10 cases
  total).
- **`src/lib/courseSourceQuality.ts`** β€” new upstream course-quality scoring
  layer that stores course-level source signals, emits “needs more material”
  warnings, and adaptively compacts over-split outlines before course
  creation.
- **`src/lib/courseSourceQuality.test.ts`** β€” targeted coverage for sparse
  uploads, adaptive topic compaction, and richer material that preserves the
  outline without compression.
- **`src/lib/workspaceNoteContent.test.ts`** β€” 2 Vitest cases covering
  end-to-end Study Workspace source-intelligence scoring on both rich and
  sparse note material.
- **Mobile workspace** — single-pane stacking and a top-bar pane-swap toggle
  in `StudyWorkspace.tsx`.
- **Keyboard shortcuts** — `1`–`0` switch tools, `L`/`T`/`S` rotate layout,
  `N` toggles notes; documented in the in-app overlay.
- **Command palette** — `⌘K` / `Ctrl+K` opens a searchable palette for every
  tool, layout, and session action (notes, agent, upload, shortcuts, close)
  with grouped results and arrow-key navigation. Available even while
  typing into text fields.
- **Scoped persistence** — whiteboard strokes, scratchpad formulas, and
  concept-map positions persist per workspace task (`workspacePersistence`
  exposes `loadWhiteboardStrokes` / `loadScratchpadFormulas` and friends).

### Changed

- **Documentation reconciliation pass** — `README.md`, `ARCHITECTURE.md`,
  `TESTING.md`, `SECURITY.md`, `DEPLOYMENT.md`, `ROADMAP.md`, and
  `server/README.md` now reflect the shipped OCR, NLP, semantic RAG,
  refresh/reset auth flows, built-in `/v1/*` rate limiting, teacher
  aggregate endpoint, current quota defaults, and the expanded Vitest
  inventory (12 files / 59 tests) plus the current Playwright spec count (2).
- **Upload/course-generation flow** β€” successful uploads now land on
  `CourseView` first instead of jumping directly into `StudyWorkspace`, so the
  learner can inspect generation diagnostics, topic compaction, and “needs
  more material” warnings before starting.
- **Course assembly pipeline** now stores `Course.sourceQuality`, lets sparse
  material reduce fallback topic counts, and recomputes quality after extend
  uploads so the course metadata evolves with the source corpus.
- **Study Workspace source intelligence** β€” `workspaceNoteContent.ts` now
  computes a bundle-level grounding score, strengths/gaps, next actions, and
  a capped-signal recommended tool so the active concept surfaces its real
  source quality instead of relying only on raw extractor counts.
- **Summarizer** rewritten as **biased TextRank with MMR** — topic-aware
  teleport vector (sentences mentioning the title/key concepts attract
  rank mass), mild lead bias, and Maximal Marginal Relevance reranker so
  near-duplicate sentences don't both appear in the top-K. Used by course
  summary, topic descriptions, lesson `intro`/`summary`, sandbox insights,
  and the Feynman reference rewrite.
- **Learning objectives** are now **Bloom-aware**: each topic walks down
  its concept list while walking up Bloom's cognitive ladder (Remember →
  Understand → Apply → Analyze → Evaluate → Create), scaled to the topic's
  difficulty and bilingual (EN/EL).
- **Comparison detection** upgraded to a three-tier pipeline: **(1)**
  Markdown tables (`parseMarkdownTables` emits `(dim, col_i, col_j)`
  rows); **(2)** "X vs Y" / "compared to" / "ενώ" sentence patterns;
  **(3)** glossary + definition fallback.
- **Fallback subject inference** is now more conservative: it classifies by
  distinct matched domain terms instead of raw repeated-token counts, and
  falls back to `General Studies` when evidence is weak or tied across
  subjects.
- **Debate-tree mining** now scores each sentence on three independent
  axes (claim / support / refute) using rich connective + modality cues
  (e.g. `because`, `for example`, `studies show` for support; `however`,
  `fails to`, `μη` for refutation; `therefore`, `is`, `must` for claims),
  plus numerical density as an evidence cue. Refutation and support nodes
  now live in separate subtrees of the layout.
- **Quiz options** use a **deterministic seeded Fisher–Yates shuffle**
  (`seedFromString(concept + correct)`), fixing the prior bug where the
  correct answer always landed at index 0 in the MC variant and the
  options would re-order on every React render.
- **`Analytics` Mastery Map** dynamically builds nodes/edges from
  `learnerModel + courses` (no more hardcoded Microeconomics graph).
- **Feynman rubric** is now subject-agnostic — key terms are derived from
  the concept and reference notes/glossary instead of hardcoded
  Cournot/Bertrand vocabulary.
- **Formula solver** rewritten as a generic shunting-yard evaluator with
  function support (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `log`,
  `ln`, `sqrt`, `exp`, `abs`, `floor`, `ceil`, `round`, `min`, `max`),
  unary minus, scientific notation, constants (`pi`, `e`), and clear error
  messages.
- **Skill-node concept matching** uses `isSameConcept` (Jaccard similarity
  over normalized token sets) instead of `slice(0, 8)` prefix collisions.
  `taskFlows.ts` follows the same pattern.
- **PDF / PPTX extraction** uses the form-feed character (`\f`) as a page
  separator so RAG chunking can attach `p.X` citations.
- **Quiz distractors** are picked by token-set Jaccard similarity ("near
  misses") over the glossary and excerpt sentences instead of the previous
  random selection.
- **Note retrieval** in `noteContentExtractors.ts` now goes through a
  one-shot BM25 corpus (`rag.ts`) for excerpts and chunks; concept-map
  edges are inferred via PMI over sliding sentence windows.
- **`ROADMAP.md`** rewritten to reflect actual progress (Stripe, session
  sync, E2E spec, migrations, code-splitting all complete).
- **`StudyWorkspace`** default `quizConcept` is now the generic
  `Study concept` instead of `Market Structures`.

### Removed

- `src/data/mockData.ts` (deprecated shim) deleted; demo content lives in
  `src/demo/mockData.ts`.
- `SupplyDemandDiagram` component (unused demo artifact).
- `marketStructures` / `microeconomics` keys from i18n.

### Fixed

- ~20 latent TypeScript errors (e.g. `Shell.tsx navItems`, `studyTimeWeek`
  on `DashboardStats`, duplicate `UserSettings` import) — `tsc --noEmit`
  is now green and used as a build gate.
- "Alex Chen · Level 7" leak when the user signs in fresh — the user
  identity is now derived from `buildInitialUser` and refreshed via
  `applyAuthIdentity` on auth/login.
- Pedagogy `pedagogyMetrics` no longer falls back to economics edges when a
  generated course is present.

## Earlier history

Pre-`Unreleased` history is summarized in `ROADMAP.md` and reachable from
`git log`. Major milestones:

- **Phase 6 server skeleton** — Express proxy, JWT auth, metering,
  Stripe checkout + webhook, library + session sync, YouTube transcript
  endpoint, admin stats, `node-pg-migrate` schema.
- **Offline content engine v2** — `contentAnalysis.ts` (segmentation,
  RAKE+TextRank, definitions, prerequisites, outline) + `analyzeContentToOutline`
  used by `processUpload` whenever the LLM is off.
- **Workspace note bundle** — eleven study tools wired through
  `noteContentExtractors.ts` and `workspaceNoteContent.ts` with `hasSource`
  empty states and citations.
- **RAG / Agent grounding** — `rag.ts` (BM25 + optional embeddings),
  `sourceContext.ts` (strict / enriched modes), citations on Agent
  responses.
- **Code-splitting build** — `dist/assets/` is now multi-chunk
  (~281 KB main entry instead of the former 8.6 MB single file).
