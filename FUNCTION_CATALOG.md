# Synapse Learning — Function Catalog & Upgrade Plan

> **Purpose.** Exhaustive inventory of every user-facing surface and discrete
> function, with implementation status, shared dependencies, and phased upgrade
> waves. This is the master checklist for product-scale depth — no feature exists
> "because it's on a page"; each entry must earn its place through coherence with
> the note-grounded pipeline.
>
> **Legend:** ✅ SHIPS · 🟡 PARTIAL · 🔴 GAP · 📋 PLANNED (next wave)
>
> **Baseline:** June 2026 · 238+ unit tests · `typecheck:all` build gate

---

## How to use this document

1. **Find a surface** (Shell nav view, overlay, workspace tool).
2. **Read each micro-function** — button, toggle, panel, automation.
3. **Check status** — if 🟡 or 🔴, see **Upgrade wave** column.
4. **Implement in wave order** — Wave 1 (recognition fidelity) before Wave 4 (backend scale).

### Completed launch phases (A–E)

| Phase | Focus | Status |
| ----- | ----- | ------ |
| A | Lesson rail + Reader structure from real headings | ✅ |
| B | Outline preview before generate | ✅ |
| C | Concept Bus panel (term ↔ tool) | ✅ |
| D | Upload toast (conversations + sections) | ✅ |
| E | Eval harness concept recall ≥ 0.6 | ✅ |

---

## Global shell (`Shell.tsx`, `App.tsx`)

| Function | File | Status | Shared libs | Upgrade wave |
| -------- | ---- | ------ | ----------- | ------------ |
| Sidebar nav (7 views) | `Shell.tsx` | ✅ | `AppView`, i18n | — |
| Mobile bottom nav | `Shell.tsx` | ✅ | — | 📋 W3 a11y |
| Upload CTA (header) | `Shell.tsx` | ✅ | `useStore.setShowUploadModal` | — |
| Command palette ⌘K | `CommandPalette.tsx` | ✅ | tasks, nav | 📋 W3 workspace deep links |
| Notifications panel | `NotificationsPanel.tsx` | 🟡 | `activities[]` | 📋 W4 real-time |
| Theme toggle | `ThemeToggle.tsx` | ✅ | `theme.ts` | — |
| Search button | `Shell.tsx` | 🟡 | opens palette | 📋 W3 global content search |
| Breadcrumb (course) | `Shell.tsx` | ✅ | `selectedCourse` | — |
| Session queue bar | `SessionQueueBar.tsx` | ✅ | `startSession` | — |
| App toast (upload success) | `AppToastBanner.tsx` | ✅ | `uploadStructureSummary` | — |

---

## Landing & Onboarding

| Function | File | Status | Notes |
| -------- | ---- | ------ | ----- |
| Get started CTA | `Landing.tsx` | ✅ | → onboarding |
| Onboarding steps (role, goal, skip demo) | `Onboarding.tsx` | ✅ | sets `user.settings` |
| Demo skip path | `Onboarding.tsx` | ✅ | `showDemoContent` |

---

## Dashboard (`Dashboard.tsx`)

| Function | Status | Shared libs | Upgrade |
| -------- | ------ | ----------- | ------- |
| Streak / XP summary | ✅ | `dashboardStats`, `user.xp` | — |
| Reviews due count | ✅ | `mergeDashboardReviewsDue`, concept bus | — |
| Weak areas list | ✅ | `workspaceWeakAreas` | — |
| Concept mastery bars | ✅ | `betaMastery` | — |
| Calibration chip | ✅ | `computeCalibration` | — |
| Activity feed | 🟡 | `activities[]` | 📋 W4 richer event types |
| Exam countdown | 🟡 | `examDate` on course | 📋 W2 timer sync |
| Navigate to tasks | ✅ | `navigate('tasks')` | — |

---

## Library (`Library.tsx`)

| Function | Status | Shared libs | Upgrade |
| -------- | ------ | ----------- | ------- |
| Courses tab (grid/list) | ✅ | `visibleCourses` | — |
| Files tab | ✅ | `uploadedFiles` | — |
| **File delete** | ✅ | `removeUploadedFileFromLibrary` | — |
| **File reprocess (course)** | ✅ | `reprocessCourseMaterial` | — |
| File pipeline version badge | ✅ | `pipelineVersion` | — |
| Search / filter | ✅ | local state | — |
| Upload button | ✅ | `onUpload` | — |
| Course card → CourseView | ✅ | — | — |
| File row status (uploading/analyzed) | ✅ | — | — |
| **Outline preview expand** | ✅ | `buildMaterialOutlinePreview` | 📋 W1 merge with course card |
| Empty state CTA | ✅ | — | — |

---

## Upload flow (`UploadModal.tsx` → `processUpload`)

| Step / function | Status | Shared libs | Upgrade |
| --------------- | ------ | ----------- | ------- |
| Drag-drop multi-file | ✅ | — | 📋 W1 audio upload |
| Paste content | ✅ | — | — |
| YouTube URL | ✅ | `youtubeTranscript` | — |
| ChatGPT JSON/ZIP | ✅ | `chatGptImport` | — |
| Configure: source mode | ✅ | strict/enriched/notes-only | 📋 W2 explainer copy |
| Configure: focus tags | ✅ | — | — |
| Configure: extend course | ✅ | `mergeOutlineIntoCourse` | — |
| **Outline preview panel** | ✅ | `previewUploadOutline` | 📋 W1 edit topics pre-generate |
| Generate → worker | ✅ | `recognizeCourse` | — |
| Processing spinner | ✅ | — | 📋 W2 stage breakdown |
| Error recovery | ✅ | — | — |
| Success toast | ✅ | `uploadStructureSummary` | — |

### Recognition pipeline (libs)

| Module | Role | Status | Upgrade wave |
| ------ | ---- | ------ | ------------ |
| `textSegmentation.ts` | Sections, headings, Q&A, page breaks | ✅ | 📋 W1 tables, front-matter |
| `sectionMerger.ts` | Page → lecture collapse | ✅ **new** | — |
| `readerBibliography.ts` | Bibliography / reference block detection | ✅ **new** | — |
| `readerMathBlocks.ts` | LaTeX / math block preservation + KaTeX | ✅ **new** | — |
| `readerTableLayout.ts` | Multi-column PDF tables + Reader `<table>` | ✅ **new** | — |
| `readerDocumentLayout.ts` | Paragraphs, lists, front-matter, tables, bib, math | ✅ | — |
| `contentAnalysis.ts` | Outline, keyphrases, glossary | ✅ | 📋 W1 embedding topics |
| `courseSourceQuality.ts` | Quality score, compaction | ✅ | — |
| `recognitionWorker.ts` | Off-thread generate | ✅ | — |
| `pdfExtract.ts` + `ocrExtract.ts` | Text + OCR (image-only PDF default) | ✅ | — |
| `pipelineMigration.ts` | Re-upload hint when pipeline stale | ✅ **new** | — |
| `uploadOutlinePreview.ts` | Pre-generate preview | ✅ | — |

---

## Course view (`CourseView.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Generation diagnostics | ✅ | — |
| Source quality band | ✅ | — |
| Topic list + density | ✅ | — |
| Open Study Workspace | ✅ | — |
| Add material (extend) | ✅ | — |
| Glossary preview | 🟡 | 📋 W2 full glossary browser |
| **Source files list** | ✅ | `CourseView.SourceFiles` |
| **Reprocess stored text** | ✅ | `store.reprocessCourseMaterial` |
| **Delete uploaded file** | ✅ | `removeUploadedFileFromLibrary`, confirm dialog |
| Pipeline version per file | ✅ | `pipelineVersion` badge |

---

## Tasks (`Tasks.tsx`)

| Function | Status | Shared libs |
| -------- | ------ | ----------- |
| Task list by course | ✅ | `tasks[]` |
| Start task → flow router | ✅ | `getTaskAction`, `startTask` |
| Complete / XP | ✅ | `completeTask` |
| Expand task detail | ✅ | — |
| Session types (review, exam, workspace) | ✅ | `taskFlows.ts` |

---

## Study Workspace (`StudyWorkspace.tsx`) — 13 tools

**Gate:** `hasSource` (≥80 chars `extractedText`) — empty state + upload CTA if false.

### Cross-cutting workspace functions

| Function | Status | Shared libs | Upgrade |
| -------- | ------ | ----------- | ------- |
| Layout modes (split / focus-lesson / focus-tool / zen) | ✅ | — | — |
| **Context strip** (step + tool + next action) | ✅ | `workspaceDiscoverability` | ✅ P0 UX |
| **Intelligence panels collapsed by default** | ✅ | discoverability + concept bus | ✅ P0 UX |
| **Weak areas rail (hidden when empty, collapsed default)** | ✅ | `WeakAreasFocusRail`, `shouldShowWeakAreasRail` | ✅ SW-P1-01 |
| **Learning action bar** (study/test/agent/flashcards) | ✅ | `workspaceLearningActions` | ✅ Prompt 4 |
| Workspace → Agent draft prompt | ✅ | `openAgentFromWorkspace` | ✅ Prompt 8 partial |
| **Source Intelligence collapsed by default** | ✅ | `SourceIntelligenceCard` | ✅ P0 UX |
| Lesson pane (steps rail) | ✅ | `buildWorkspaceStepsFromNotes` | 📋 W1 step ↔ section scroll |
| Source Intelligence card | ✅ | `documentStructureReport` | 📋 W1 merged section count |
| **Discoverability panel** | ✅ | `workspaceDiscoverability` | ✅ sticky rail |
| **Concept Bus panel** | ✅ | `conceptBusPanelModel` | ✅ sticky rail |
| Concept Lens bar | ✅ | `workspaceConceptBus` | — |
| Command palette (workspace) | ✅ | — | — |
| Keyboard shortcuts 1–0, L/T/S, N, ? | ✅ | — | — |
| Spaced step schedule | ✅ | `spacedStepSchedule` | — |
| Concept bus → store sync | ✅ | `conceptBusSync` | — |
| Mobile single-pane swap | ✅ | — | — |
| Session notes slide-over | ✅ | `workspacePersistence` | — |

### Tool-by-tool

#### Reader (`CognitiveReader.tsx`)

| Function | Status | Libs | Upgrade |
| -------- | ------ | ---- | ------- |
| Structured segments (h3/p/ul/ol) | ✅ | `buildReaderSegments` | — |
| **Front-matter card** | ✅ **new** | `FrontMatterCard` | — |
| **Ordered syllabus lists** | ✅ **new** | `listOrdered` | — |
| Full vs excerpt toggle | ✅ | `sourceFullText` | — |
| Section nav chips (lectures only) | ✅ | `readerSectionNav` | — |
| Annotate / highlights | ✅ | `readerAnnotationStore` | — |
| Dyslexia mode | ✅ | — | — |
| TTS read-all | ✅ | `readerTts` | — |
| Bilingual sync + translate | 🟡 | `readerTranslation` | 📋 W2 offline translate |
| OCR overlay | ✅ | `readerOcrOverlay`, server `ocrServer` bboxes | v2 low-confidence styling |
| Heatmap / bionic | ✅ | — | — |
| Term focus → concept bus | ✅ | `noteConceptActivity` | — |

#### Concept map (`DraggableConceptMap.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Force / hierarchy layout | ✅ | — |
| PMI edges from notes | ✅ | — |
| Node click → Reader focus | ✅ | — |
| Collaborative cursors SSE | 🟡 | 📋 W4 production SSE |
| PNG export | ✅ | — |
| Empty state | ✅ | — |

#### Leitner (`LeitnerBox.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| FSRS ratings 1–4 | ✅ | — |
| Due queue ordering | ✅ | `leitnerDeckSync` | — |
| Anki export | ✅ | — |
| Heatmap 7-day | ✅ | — |
| → `submitLeitnerRating` → store | ✅ | — |

#### Quiz (`WorkspaceQuizSession.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Multi-item session | ✅ | `quizSession` | — |
| Confidence 1–5 | ✅ | — |
| IRT display | ✅ | `quizIrt` | — |
| → concept bus signals | ✅ | — |

#### Feynman (`FeynmanCheck.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Rubric scoring | ✅ | `feynmanRubric` | — |
| Gap detection → Reader | ✅ | — |
| Voice input | 🟡 | 📋 W2 browser STT polish |
| PDF export | ✅ | — |

#### Compare (`ComparisonTable` / `DiagramGenerator`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Table from notes | ✅ | `extractComparisons` | — |
| Sort / diff highlight | ✅ | — |
| CSV export | ✅ | — |

#### Simulator (`InteractiveSimulator.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Note-grounded sliders | ✅ | `sandboxInsightFromNotes` | — |
| Sensitivity heatmap | ✅ | — |

#### Debate (`ArgumentMap.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Claim tree from notes | ✅ | `buildDebateTreeFromNotes` | — |
| Rebuttal graph | 🟡 | 📋 W2 interactive depth |

#### Scratchpad (`FormulaScratchpad.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Formulas from notes | ✅ | `extractFormulas` | — |
| CAS graph | 🟡 | — |
| → Whiteboard bridge | ✅ | — |

#### Whiteboard (`StudyWhiteboard.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Layers | ✅ | — |
| LaTeX stamps | ✅ | — |
| Scratchpad import | ✅ | — |

#### Timer (`StudyTimer.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Focus sessions | ✅ | — |
| Exam .ics export | ✅ | — |
| → `logStudyMinutes` | ✅ | — |

#### Annotations (`AnnotationOverlay.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Highlights + margin notes | ✅ | — |
| Teacher SSE shared notes | 🟡 | 📋 W4 |

#### Dashboard tab (`MiniDashboard.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| In-workspace stats | ✅ | `buildMiniDashboardProps` | — |

---

## Agent (`Agent.tsx`)

| Function | Status | Libs | Upgrade |
| -------- | ------ | ---- | ------- |
| BM25 RAG citations | ✅ | `rag.ts` | — |
| Hybrid embedding rerank | 🟡 | `embeddingRerank` | 📋 W2 offline embeddings default |
| Modes (socratic, etc.) | ✅ | `agentMode` | — |
| Strict source grounding | ✅ | `sourceContext` | — |
| Page citations after `\f` fix | ✅ | — | — |

---

## Analytics (`Analytics.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Mastery map from real data | ✅ | — |
| Time-on-task charts | 🟡 | 📋 W3 `studyTimeWeek` depth |
| i18n | 🔴 EN-only labels | 📋 W3 EL |

---

## Settings (`Settings.tsx`)

| Function | Status | Upgrade |
| -------- | ------ | ------- |
| Language EL/EN | ✅ | — |
| LLM proxy URL / token | ✅ | — |
| Demo showcase toggle | ✅ | `demoMode` | — |
| Auth login/register | ✅ | `authClient` | — |
| Plan refresh | ✅ | — |
| Library/session sync buttons | ✅ | — |
| Pedagogy preferences | ✅ | — |

---

## Teacher (`TeacherDashboard.tsx`)

| Function | Status | Notes |
| -------- | ------ | ----- |
| Live API aggregates | ✅ | `GET /v1/teacher/dashboard` — courses, usage, publishing |
| Course roster table | ✅ | Server library + open local course |
| EL/EN chrome | ✅ | `teacherContent.ts` |
| Local session panel | ✅ | Streak, events (device-local until multi-tenant) |

---

## Overlays (modals / full-screen)

| Surface | Key functions | Status |
| ------- | ------------- | ------ |
| `LessonView` | Grounded lesson + LLM panels | ✅ |
| `PracticalLessonView` | Note exercises | ✅ |
| `ReviewSessionView` | FSRS cards | ✅ |
| `MistakeRetryView` | Open mistakes | ✅ |
| `ExamPrepView` | Timed exam | ✅ |
| `PrerequisiteRepairView` | Prereq steps | ✅ |

---

## Upgrade waves (execution order)

### Wave 1 — Note recognition fidelity (COMPLETE)

- [x] Page → lecture merge (`sectionMerger.ts`)
- [x] Ordered syllabus lists + front-matter card
- [x] Adaptive paragraph reconstruction
- [x] Tables / multi-column PDF
- [x] Bibliography / reference block detection
- [x] LaTeX / math block preservation
- [x] OCR default for image-only PDFs
- [x] Re-upload migration hint in UI

### Wave 2 — Workspace UX coherence

- [x] Sticky intelligence rail (Discoverability + Concept Bus)
- [x] Section nav shows lectures only (post-merge)
- [x] Step rail ↔ Reader scroll sync
- [x] Weak area chips → workspace focus
- [x] Outline topic edit before generate (`outlineTopicEdit`, `OutlinePreviewPanel`)
- [x] Reprocess stored text (`pipelineReprocess`, migration banner)
- [x] D9 analyzedText fallback (`uploadPipeline.buildCourseFromUpload`)

### Wave 2.5 — Greek PDF + workspace P0

- [x] `repairGreekDocumentText` in `normalizeDocumentText` — spaced glyphs + OCR glue + lexicon split (v2.3.0, reprocess path)
- [x] Lesson rail from `buildReaderSegments` (`readerSegmentsToStepSections`)
- [x] Flashcards/quiz exclude `isFrontMatterBlock` / admin metadata
- [x] Default workspace concept = first course topic (never `Study concept`)

### Wave 2.6 — Tool empty-state coherence

- [x] `no-source` vs `no-extract` empty states (`workspaceEmptyState.ts`)
- [x] Upload CTA hidden when `hasSource=true` but tool extract is empty
- [x] Secondary actions: custom formula, start debate tree

### Wave 3 — Surface polish

- [x] MiniDashboard study-time depth (today/week + 7-day spark)
- [x] Global content search (`globalContentSearch` + CommandPalette Ctrl+K)
- [x] Analytics + Feynman i18n (shell, overview tab, rubric dimensions)

### Wave 3.1 — Analytics tabs i18n

- [x] Mastery tab (strong/weak/almost-known/misconceptions, skill bars)
- [x] Behavior tab (metrics, error patterns, adaptive model vars)
- [x] Insights tab (learned insights, recommendations empty state)
- [x] Overview polish (readiness sublabel, calibration labels, weekday letters)

### Wave 3.2 — Agent + Onboarding i18n

- [x] `agentContent.ts` — 15 modes, quick actions, chrome (EL/EN)
- [x] `onboardingContent.ts` — roles, goals, all step copy (EL/EN)
- [x] Landing already via `landingContent.ts` (no change)

### Wave 3.3 — Locale-aware dates

- [x] `localeFormat.ts` — `el-GR` / `en-US` relative, date-time, heatmap tooltips
- [x] ActivityFeed + NotificationsPanel wired to `lang`
- [x] Analytics study heatmap tooltips localized

### Wave 4.1 — Teacher UI (institution demo)

- [x] Extended `GET /v1/teacher/dashboard` — course roster, glossary, publishing, `syncedAt`
- [x] `TeacherDashboard` — usage meter, roster table, annotations, local session panel
- [x] `teacherContent.ts` EL/EN · integration test for dashboard endpoint

### Wave 4.2 — Billing webhooks hardening

- [x] Webhook signature required in production (`STRIPE_WEBHOOK_SECRET`)
- [x] Idempotent dispatch by Stripe `event.id` (`webhookIdempotency.ts`)
- [x] `customer.subscription.updated` → plan sync from price id
- [x] `invoice.payment_failed` logged · `subscription_data.metadata` on checkout
- [x] Unit + integration tests for dedup and plan upgrade

### Wave 4 — Production backend (remaining)

- [ ] Metering dashboards (org-level)
- [x] Billing webhooks hardening (W4.2)
- [ ] Server RAG index persistence
- [ ] Multi-tenant class roster + cohort analytics (post-demo)

---

## Shared dependency graph (simplified)

```
upload → pdfExtract/ocr → textSegmentation → sectionMerger
       → contentAnalysis → courseSourceQuality → Course
       → buildWorkspaceNoteBundle → 13 tools
       → workspaceConceptBus ↔ conceptBusSync ↔ session API
```

Every tool **must** read from `buildWorkspaceNoteBundle()` — never demo filler when `hasSource` is false.

---

## Maintenance

- Run `npm run doc-lint` after doc edits.
- Run `npm run eval` after recognition changes.
- Update this catalog when adding any user-visible control.
