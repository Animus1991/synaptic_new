# Synapse Learning — Product Upgrade Master Plan

> **Version:** June 2026 · Post-session handoff  
> **Baseline:** `CONTENT_PIPELINE_VERSION = 2.2.1` · 300+ Vitest client tests · server 13/13  
> **Purpose:** Exhaustive audit, phased upgrade roadmap, and LLM implementation prompt for transforming Synapse from a feature-rich prototype into a coherent, pedagogically meaningful, production-scale learning platform.

---

## 1. Executive summary

Synapse Learning is a note-grounded AI study platform (React/Vite client, optional Node proxy server) supporting Greek and English academic material. The core loop is: **upload → extract/segment → course outline → Study Workspace tools → Agent/tasks/progress**.

**Strengths today**
- End-to-end upload pipeline with outline preview, Greek text repair (spaced glyphs + OCR glue), reprocess-without-reupload
- 13 Study Workspace tools wired to shared concept/correlation bus
- Concept Bus, Reader, spaced steps, IRT quiz, Leitner, teacher dashboard (W4.1), billing webhooks (W4.2)
- Bilingual UI (EL/EN) across major surfaces

**Critical gaps (user-reported + audit)**
1. **Study Workspace UX** — visual overload, unclear hierarchy, too many panels open by default
2. **Document management** — delete/reprocess was missing from UI (now partially shipped)
3. **OCR/Greek fidelity** — glued words and spaced glyphs still appear on some ΕΚΠΑ PDFs
4. **No user-authored notes MVP** — platform ingests but does not yet let teachers edit/create in-app
5. **No collaborative study** — social features not started (correctly deferred)
6. **Backend scale** — RAG persistence, org metering, multi-tenant roster remain Wave 4

**This session completed**
- Wired `onRemoveFile` in `App.tsx` → `store.removeUploadedFile`
- Study Workspace P0 UX: intelligence panels collapsed by default, context strip, Source Intelligence collapsed by default
- Tests for `removeUploadedFileFromLibrary` (2/2 pass)
- This master plan document

---

## 2. Repository map (areas inspected)

| Area | Key paths |
|------|-----------|
| Shell / routing | `App.tsx`, `Shell.tsx` |
| Pages | `Landing`, `Onboarding`, `Dashboard`, `Library`, `CourseView`, `Tasks`, `Agent`, `Analytics`, `Settings`, `TeacherDashboard` |
| Study Workspace | `components/workspace/*` (13 tools) |
| Upload / ingestion | `uploadPipeline.ts`, `UploadModal.tsx`, `textSegmentation.ts`, `greekTextRepair.ts`, `documentStructureReport.ts`, `readerDocumentLayout.ts` |
| Reprocess / migration | `pipelineReprocess.ts`, `pipelineMigration.ts`, `ReuploadMigrationBanner.tsx` |
| Document delete | `removeUploadedFile.ts`, `CourseView.SourceFiles` |
| State | `store/useStore.ts`, `workspacePersistence.ts` |
| Server | `server/src/routes/*` (teacher, billing, ocr, rag) |
| Catalog / docs | `FUNCTION_CATALOG.md`, `API.md`, `SECURITY.md` |

---

## 3. Page-by-page audit

For each page: **Purpose → Weaknesses → Required changes → Acceptance criteria**

### 3.1 Landing (`Landing.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Marketing + CTA to onboarding |
| Visual | ✅ Bilingual via `landingContent.ts` |
| Functional | ✅ Demo path works |
| Weaknesses | No product screenshot/video of Study Workspace; value prop doesn't mention Greek syllabus/OCR |
| Changes | Add “Greek academic PDF” bullet; link to docs on reprocess |
| Defer | A/B hero variants |

### 3.2 Onboarding (`Onboarding.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Role/goal capture, optional demo |
| Status | ✅ W3.2 i18n complete |
| Weaknesses | Doesn't explain upload → workspace flow; teacher role not linked to Teacher Dashboard |
| Changes | Add 1 step: “How material becomes lessons”; teacher → `TeacherDashboard` hint |
| Tests | Extend `onboardingContent.test.ts` |

### 3.3 Dashboard (`Dashboard.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Home: streak, weak areas, reviews, activity |
| Weaknesses | Activity feed still mock-heavy; exam countdown not synced to workspace timer |
| Changes | W4 richer events; wire exam date to `StudyTimer` |
| Keep | Weak areas → workspace focus rail integration |

### 3.4 Library (`Library.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Course grid + files tab |
| Weaknesses | **No delete file from Files tab** (only CourseView Sources); outline preview not on card |
| Changes | **P1:** Add delete + reprocess to file rows; merge outline preview on course card |
| Acceptance | User can manage files from Library without opening course |

### 3.5 Upload (`UploadModal.tsx` → `processUpload`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Multi-file ingest, outline preview, generate course |
| Strengths | Outline preview, source modes, ChatGPT/YouTube paths |
| Weaknesses | No per-file remove during upload; OCR progress opaque; no “replace file” |
| Changes | Show pipeline version on success toast; per-file cancel before analyze |
| Pipeline | See §5 |

### 3.6 Course view (`CourseView.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Course hub: topics, sources, workspace entry |
| **Shipped this session** | Delete file, reprocess, pipeline version badge |
| Weaknesses | Glossary browser partial; no “replace document”; delete doesn't list derived artifacts (lessons/tasks) |
| Changes | **P1:** Destructive dialog lists: lessons, concept spans, embeddings (when server RAG exists) |
| Acceptance | Delete → toast → sources update → optional auto-reprocess |

### 3.7 Study Workspace (`StudyWorkspace.tsx`) — **P0**

See **§4** (deep audit).

### 3.8 Reader (`CognitiveReader.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Source reading, highlights, section nav, OCR low-confidence styling |
| Weaknesses | Multi-column order still wrong on some PDFs; math rendering fallback crude |
| Changes | Sync step rail ↔ reader sections (W1); table blocks responsive |
| Keep | `GoToSource`, concept span highlights |

### 3.9 Tasks (`Tasks.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | Task list → workspace/practical/review flows |
| Weaknesses | Task copy not always tied to current section |
| Changes | Pass `sectionId` into workspace focus |

### 3.10 Agent (`Agent.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Purpose | 15 modes, context from course |
| Status | ✅ W3.2 i18n |
| Weaknesses | Not always aware of workspace step/tool; generic prompts |
| Changes | **P2:** Inject `workspaceFocus`, `currentStep`, `activeTool` into Agent context payload |

### 3.11 Analytics (`Analytics.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Status | ✅ W3.1 i18n, W3.3 locale dates |
| Weaknesses | Mastery/behavior tabs still partial real data |
| Defer | W4 org aggregates |

### 3.12 Teacher Dashboard (`TeacherDashboard.tsx`)

| Dimension | Assessment |
|-----------|------------|
| Status | ✅ W4.1 roster + publishing summary |
| Weaknesses | No time-limited student access UI; no in-app authoring |
| Defer | §7 |

### 3.13 Settings, Exam prep, Review, Practical lesson views

| Surface | Status | Note |
|---------|--------|------|
| Settings | ✅ | Auth proxy, theme, language |
| ExamPrepView | 🟡 | Needs workspace timer sync |
| ReviewSessionView | ✅ | Leitner path |
| PracticalLessonView | ✅ | Code editor path |
| PrerequisiteRepairView | ✅ | Concept repair flow |

### 3.14 Server (`server/`)

| Route | Status | Gap |
|-------|--------|-----|
| OCR | 🟡 | Bboxes + low-confidence; needs Greek tuning |
| Teacher | ✅ | Dashboard aggregates |
| Billing | ✅ | W4.2 webhooks hardened |
| RAG | 🔴 | pgvector persistence not shipped (W4.4) |

---

## 4. Study Workspace — deep audit & redesign

### 4.1 Current architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Top bar: close · title · course · notes · zen · agent      │
│ Progress bar                                                 │
│ [NEW] Context strip: step · tool · next action · concept bus │
├──────────┬────────────────────────────┬─────────────────────┤
│ Tool     │ Lesson panel (left)        │ Tool panel (right)    │
│ Dock     │ · step rail                │ · intelligence rail   │
│ (13)     │ · source intel (collapsed) │   (collapsed default) │
│          │ · LessonContent            │ · ConceptLensBar      │
│          │ · nav footer               │ · active tool surface │
└──────────┴────────────────────────────┴─────────────────────┘
```

### 4.2 Weaknesses found (pre-fix)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| SW-01 | Discoverability + Concept Bus panels **expanded by default** | P0 | ✅ Fixed: default `false` |
| SW-02 | Source Intelligence card always expanded — competes with lesson | P0 | ✅ Fixed: collapsed chip |
| SW-03 | No single “where am I / what next” strip | P0 | ✅ Fixed: context strip |
| SW-04 | Intelligence rail + ConceptLensBar + weak areas + metrics = clutter | P0 | ✅ Fixed: weak areas rail collapsed when empty (SW-P1-01) |
| SW-05 | Step rail duplicates reader section nav | P1 | ✅ Fixed: bidirectional reader↔step sync (SW-P1-04) |
| SW-06 | Tool dock 13 icons — no grouping on mobile | P1 | ✅ Fixed: `WorkspaceMobileToolDrawer` + bottom bar (SW-P1-02) |
| SW-07 | LessonContent actions not consistently “next best action” | P1 | ✅ Fixed: `lessonStepToolbarNextActionSync` ↔ `nextActionEngine` |
| SW-08 | Zen mode hides context strip — OK | — | Keep |
| SW-09 | Empty state good (`WorkspaceEmptyState`) | ✅ | — |
| SW-10 | Reupload banner compact in workspace | ✅ | User should reprocess for 2.2.1 |

### 4.3 Redesign target (state-of-the-art)

**Principles**
1. **One primary focus** — lesson text OR active tool, not both fighting
2. **Progressive disclosure** — intelligence, concept bus, source quality behind 1-click
3. **Next action always visible** — context strip CTA
4. **Source vs AI** — label enrichment clearly in LessonContent + Reader
5. **Greek readability** — line-height, section headings, avoid dense badges

**Phase 2 layout (recommended)**

| Zone | Content | Default state |
|------|---------|---------------|
| A — Context | Step, course, concept, next action | Always visible |
| B — Primary | Reader OR Lesson (user picks, default split) | Reader 65% on desktop |
| C — Secondary | Tool surface OR lesson (swappable) | Tab on mobile |
| D — Intelligence | Discoverability, Concept Bus, weak areas | Collapsed |
| E — Dock | Tools by cluster (Read / Practice / Create / Meta) | Icons + tooltips |

### 4.4 Per-component audit

| Component | Keep? | Issue | Action |
|-----------|-------|-------|--------|
| `WorkspaceDock` | ✅ | 13 tools flat on mobile | Add mobile drawer with clusters |
| `WorkspaceDiscoverabilityPanel` | ✅ | Was always open | Collapsed + context strip link |
| `ConceptBusPanel` | ✅ | Hidden value when collapsed | Toggle in context strip |
| `WeakAreasFocusRail` | ✅ | Always visible | **P1:** Collapse when no weak spots |
| `SourceIntelligenceCard` | ✅ | Too prominent | Collapsed default |
| `LessonContent` | ✅ | Dense | Add action row: Read / Quiz / Agent |
| `CognitiveReader` | ✅ | Core | Section ↔ step sync |
| `ConceptLensBar` | 🟡 | Overlays tool | Move into context strip on mobile |
| `MiniDashboard` | ✅ | Duplicate dashboard | Hide when `dashboard` tool not active |
| `ReuploadMigrationBanner` | ✅ | Critical | Show when `courseNeedsReupload` |

### 4.5 Study Workspace — remaining implementation checklist

- [x] SW-P1-01: Collapse `WeakAreasFocusRail` when `spots.length === 0`
- [x] SW-P1-02: Mobile tool drawer (replace tiny dock) — `WorkspaceMobileToolDrawer.tsx`, `StudyWorkspace` bottom bar (`552d0ef`)
- [x] SW-P1-03: `LessonStepToolBar` unified actions (Study / Test / Explain / Agent) — `lessonStepUnifiedActions.ts` + action row on toolbar
- [x] SW-P1-04: Reader section click → workspace step (bidirectional) — `readerStepSyncBridge`, `readerStepSyncP104QA` (`993963f`–`552d0ef`)
- [x] SW-P2-05: Agent opens with workspace context JSON — `buildAgentContextSystemBlock`, collapsible JSON in `AgentContextBanner`
- [x] SW-P2-06: Reduce `ConceptLensBar` overlap on small screens — `ConceptLensPanel` strip mode `< lg`
- [x] SW-P2-07: Dark/light contrast audit (WCAG AA) — `index.css` text token pass
- [x] SW-P3-08: Keyboard shortcut help panel (`?`) i18n — `WorkspaceKeyboardHelp`, `workspaceKeyboardShortcuts.ts`

---

## 5. Text recognition & ingestion pipeline

### 5.1 Current pipeline (v2.2.1)

```
File → extract (pdf.js / docx / image OCR) → normalizeDocumentText()
  → repairGreekDocumentText() [spaced + glued]
  → buildMaterialOutlinePreview() → sections / front-matter / bibliography
  → buildConceptSpans() → course + uploadedFiles.pipelineVersion
```

### 5.2 Weaknesses by file type

| Type | Issue | Priority | Fix | Status |
|------|-------|----------|-----|--------|
| Image-only PDF | OCR glue, spacing | P0 | Extend `repairGluedGreekText` + sentence heuristics | 🟡 partial |
| Multi-column PDF | Wrong reading order | P0 | `layoutAwareTextFromItems` in `pdfExtract.ts` + `repairInterleavedTwoColumnText` in `readerTableLayout.ts` | ✅ extract path |
| Greek syllabus | Front-matter conflated with lectures | P1 | `FrontMatterCard` + lecture merge rules | ✅ partial |
| Slides PDF | One section per page | P1 | `logicalSectionMerge` by “ΔΙΑΛΕΞΗ” pattern | ✅ partial |
| Tables | Flattened to prose | P1 | Table block type in segmentation | ✅ `segmentationEmbeddedBlocks.ts` → `detectDocumentSections` |
| Math | Corrupted LaTeX / lost zones | P2 | Math zone detection in segmentation + Reader KaTeX | ✅ detection in segmentation + Reader; OCR repair pending |
| Mixed EL/EN | Heading patterns | P1 | Bilingual heading regex set | ✅ partial |
| Scanned photos | Low confidence | P1 | Style `ocrRegions` + user reprocess CTA | 🟡 partial |

### 5.3 Algorithm improvements (concrete tasks)

1. **Greek glued words** (`greekTextRepair.ts`)
   - Add fixture-driven phrase dictionary from user PDFs
   - Sentence-level: if >40% single-char tokens separated by space → `repairSpacedGreekText`
   - Unit tests per regression PDF snippet

2. **Multi-column** (`pdfExtract.ts`, `readerTableLayout.ts`) — ✅ column-major extract + interleaved repair

3. **Table + math blocks** (`segmentationEmbeddedBlocks.ts`, `textSegmentation.ts`) — ✅
   - `extractReaderTables` + `extractReaderMathBlocks` → `boundaryKind: table | math`
   - Shared splitter wired in `readerDocumentLayout.ts` and `detectDocumentSections`

4. **Lecture merge** (`textSegmentation.ts`)
   - Regex: `^ΔΙΑΛΕΞΗ\s+\d+` → start new logical unit until next match
   - Do not split on page breaks inside lecture

5. **Bibliography** (`BibliographyBlock.tsx`)
   - Detect `Βιβλιογραφία|Bibliography|References`
   - Separate from quiz generation context

6. **Reprocess path**
   - User action: CourseView or Workspace banner → `reprocessCourseMaterial`
   - **No re-upload required** for pipeline upgrades
   - After delete file: auto-reprocess remaining sources

### 5.4 Acceptance criteria (recognition)

- Reprocess «Διανομή εισοδήματος» syllabus: glued phrases fixed, lectures merged
- Reader shows ordered sections, not page-per-section
- `pipelineVersion` bumps to current on reprocess
- Existing Vitest + Playwright Greek fixture pass

---

## 6. Delete / reprocess document management

### 6.1 Shipped

| Action | UI | Backend logic |
|--------|-----|---------------|
| Delete file | CourseView → Sources → trash | `removeUploadedFileFromLibrary` |
| Reprocess all | CourseView + Workspace banner | `reprocessCourseMaterial` |
| Confirm dialog | EL/EN | Explains reprocess of remaining |
| Auto-reprocess | On delete if other files remain | `reprocessCourseFromStoredText` |

### 6.2 Remaining gaps

| Gap | Priority | Plan |
|-----|----------|------|
| Delete from Library files tab | P1 | ✅ Shipped — trash + reprocess on file rows |
| Replace file (same slot) | P2 | Upload → replace `fileId` |
| Soft-delete / archive | P2 | `status: 'archived'` on `UploadedFile` |
| Cascade delete lessons/tasks | P2 | Document in dialog; optional checkbox |
| Server-side blob delete | P3 | When files stored on server |

### 6.3 User instruction (re-upload vs reprocess)

- **Pipeline upgrade only** → use **«Επανεπεξεργασία κειμένου»** (reprocess stored text)
- **Wrong file uploaded** → **Delete** then upload again
- **Multiple files, one bad** → Delete bad file; others auto-reprocess

---

## 7. User-editable notes & teacher mode (roadmap)

### 7.1 MVP editable notes (minimal safe)

| Feature | Data model | UI entry |
|---------|------------|----------|
| Fix OCR line | `UploadedFile.extractedText` patch | Reader inline edit |
| Rename section | `readerSegments[].heading` override | Reader context menu |
| Split/merge section | `logicalSections[]` | CourseView editor tab |

**Blockers:** No versioning; patches overwrite `extractedText` — need `textRevision` + undo stack.

### 7.2 Teacher / tutor mode (future)

- Create course from scratch (empty `extractedText` + structured lessons)
- Authoring toolbar: heading, example, warning, exam-relevant flag
- Publish lesson pack → `sharedAnnotationStore` pattern extended
- **Time-limited access:** `enrollment { studentId, courseId, expiresAt, role }`
- Student progress retained per privacy policy

**Do not implement** until Study Workspace P1 complete.

### 7.3 Data models needed

```ts
interface TextRevision { fileId; version; patch; authorId; createdAt }
interface CourseEnrollment { courseId; userId; role; expiresAt?; permissions }
interface AuthoredBlock { id; courseId; type; content; order; metadata }
```

---

## 8. Collaborative study rooms (roadmap)

**Deferred intentionally.** Architecture sketch:

- `StudyRoom { id, mode: 'same-material' | 'co-focus', participants[], sharedTimer? }`
- WebSocket or polling for presence (reuse `annotationRealtimeSync` patterns)
- No voice/video in MVP
- Privacy: invite-only, report/block

**Do not add UI widgets** until single-user loop is excellent.

---

## 9. Implementation phases (strict order)

| Phase | Focus | Est. | Status |
|-------|-------|------|--------|
| **P0** | Study Workspace clutter reduction | 1 session | 🟡 Partial |
| **P0** | Delete file + wire App | 1 session | ✅ Done |
| **P1** | Library file delete; weak areas collapse | 1 session | 📋 |
| **P1** | Greek OCR v2.3 (fixtures + column order) | 2 sessions | 📋 |
| **P1** | Reader ↔ step sync | 1 session | 📋 |
| **P2** | Agent workspace context | 1 session | 📋 |
| **P2** | Editable notes MVP (OCR fix) | 2 sessions | 📋 |
| **P3** | Teacher authoring shell | 3+ sessions | 📋 |
| **P4** | Collaborative study | 5+ sessions | 📋 |
| **W4.3+** | Org metering, server RAG | backend | 📋 |

---

## 10. Tests & quality gate

| Suite | Command | Expected |
|-------|---------|----------|
| Client unit | `npm run test` | 300+ pass |
| Remove file | `vitest removeUploadedFile.test.ts` | 2/2 ✅ |
| Greek repair | `greekTextRepair.test.ts`, `pipelineReprocess.test.ts` | pass |
| Server | `npm run test --prefix server` | 13/13 |
| Typecheck | `npm run typecheck:all` | green ✅ |
| E2E | Playwright Greek syllabus | maintain |

---

## 11. Files changed (this continuation session)

| File | Change |
|------|--------|
| `src/App.tsx` | Wire `onRemoveFile={store.removeUploadedFile}` |
| `src/components/workspace/StudyWorkspace.tsx` | Panels collapsed default; context strip; source intel collapsed |
| `src/lib/removeUploadedFile.test.ts` | Fix ConceptSpan types + Greek fixture for reprocess |
| `FUNCTION_CATALOG.md` | Delete file + workspace UX entries |
| `PRODUCT_UPGRADE_MASTER_PLAN.md` | This document |

---

## 12. Known limitations (honest)

1. Delete does not remove generated lessons/tasks (course-level content remains)
2. ~~Library files tab has no delete yet~~ ✅ Files tab delete + reprocess shipped
3. OCR still imperfect on some scanned ΕΚΠΑ PDFs — reprocess helps but not magic
4. Study Workspace still split-panel heavy on desktop — Phase 2 layout not done
5. Server RAG not persistent — embeddings client-local / mock
6. Teacher time-limited access not implemented
7. No collaborative rooms

---

## 13. Next recommended step

1. **User:** Open course «Διανομή εισοδήματος» → **Επανεπεξεργασία κειμένου** (pipeline 2.2.1)
2. **Dev:** EKPA PDF QA — fixed-gap column tables + glued math OCR repair fixtures (`greekTextRepair.test.ts`, `pdfExtract.test.ts`, `segmentationEmbeddedBlocks.test.ts`)
3. **Dev:** Greek OCR v2.3 — glued-word phrase dictionary from user PDF snippets
4. **Dev:** Sync remaining `WORKSPACE_TOOLS_UPGRADE.md` backlog items

---

# APPENDIX A — LLM HANDOFF PROMPT (copy-paste)

Use the following prompt verbatim for the next implementation agent:

---

```
You are a senior full-stack engineer, frontend architect, UI/UX systems designer, EdTech product architect, and document-ingestion engineer working on Synapse Learning (React/Vite + optional Node server).

REPOSITORY: synapse-learning/
CATALOG: FUNCTION_CATALOG.md (implement ONE catalog row at a time unless user says otherwise)
MASTER PLAN: PRODUCT_UPGRADE_MASTER_PLAN.md
PIPELINE VERSION: CONTENT_PIPELINE_VERSION in src/lib/pipelineConstants.ts (currently 2.2.1)

NON-NEGOTIABLE RULES
1. Do NOT git commit unless user explicitly asks.
2. Do NOT add social/collaborative UI before Study Workspace is excellent.
3. Do NOT claim production backend readiness for RAG/multi-tenant.
4. Greek academic PDFs are a first-class requirement (ΕΚΠΑ syllabi, glued OCR, spaced glyphs).
5. Prefer reprocess stored text over forcing re-upload when pipeline improves.
6. Every UI element must answer: what is it, why here, what can I do, how does it help learning.
7. Preserve existing tests; run typecheck:all before finishing.
8. Match existing code conventions; minimal focused diffs.

COMPLETED (do not redo)
- removeUploadedFileFromLibrary + CourseView trash + App.tsx onRemoveFile
- Study Workspace: intelligence panels collapsed by default, context strip, source intel collapsed
- Greek repairGluedGreekText + repairGreekDocumentText in normalizeDocumentText
- reprocessCourseMaterial without re-upload
- Waves 3.1–3.3 i18n, 4.1 teacher dashboard, 4.2 billing webhooks
- **Launch Wave 7 (Jun 2026, `552d0ef`):** SW-07 `lessonStepToolbarNextActionSync`, SW-P1-02 mobile tool drawer, SW-P1-04 reader↔step sync, UTF-8 mojibake repair (`utf8MojibakeRepair.ts`), Noto Sans Greek typography
- **Launch Wave 8A (Jun 2026, `49afe23`):** SW-P2-05 Agent context JSON, SW-P2-06 ConceptLens strip `< lg`, SW-P2-07 WCAG contrast tokens, SW-P3-08 keyboard help EL/EN
- **Pipeline P0 (Jun 2026, `1cd7e5e`):** table + math block types in `detectDocumentSections` via `segmentationEmbeddedBlocks.ts`; shared splitter in Reader layout

PRIORITY ORDER (strict)
1. EKPA PDF QA — fixed-gap column tables + glued math OCR repair fixtures
2. Greek OCR v2.3: multi-column order, lecture merge, more glued-word fixtures
3. Editable notes MVP (OCR line correction in Reader)
4. Teacher authoring shell (plan only unless requested)
5. Collaborative study (plan only)

STUDY WORKSPACE TASKS (implement one per session minimum)
- SW-P1-01: Collapse WeakAreasFocusRail when spots.length === 0 — ✅
- SW-P1-02: Mobile tool drawer with clustered tools — ✅
- SW-P1-03: LessonStepToolBar — unified actions: Study section, Test me, Explain from zero, Ask Agent — ✅
- SW-P1-04: CognitiveReader section nav → setCurrentStep; step rail → reader scroll — ✅
- SW-P2-05: Agent workspace context JSON — ✅
- SW-P2-06: ConceptLens strip on `< lg` — ✅
- SW-P2-07: WCAG contrast token pass — ✅
- SW-P3-08: Keyboard shortcut help (`?`) EL/EN — ✅

DOCUMENT MANAGEMENT
- Add delete/reprocess to Library.tsx files tab using store.removeUploadedFile and store.reprocessCourseMaterial
- Improve delete dialog: list derived artifacts (lessons count, concept spans count)

TEXT RECOGNITION
- Add test fixtures from Greek syllabus PDFs to greekTextRepair.test.ts
- Implement multi-column reading order in readerDocumentLayout.ts
- Merge ΔΙΑΛΕΞΗ N sections across pages in textSegmentation.ts
- Bump CONTENT_PIPELINE_VERSION on behavioral changes; update pipelineReprocess tests

ACCEPTANCE CRITERIA PER TASK
- typecheck:all passes
- relevant vitest files pass
- UI change has data-testid where appropriate
- FUNCTION_CATALOG.md row updated when function ships
- No orphaned UI states after delete/reprocess

WHEN DONE, REPORT
1. What was implemented (files + behavior)
2. What remains from PRODUCT_UPGRADE_MASTER_PLAN.md
3. Test results
4. Whether user should reprocess existing courses
```

---

# APPENDIX B — Feature rationalization template

For any new or existing UI element, fill:

| Question | Answer |
|----------|--------|
| Why exists? | |
| User problem? | |
| Necessary now? | |
| Understandable without help? | |
| Supports learning workflow? | |
| Connects to source/concepts/tasks? | |
| Clarity or clutter? | |
| Complete or half-finished? | |
| Empty/loading/error states? | |
| Mobile behavior? | |
| Verdict: keep / redesign / merge / hide / remove / defer | |

---

*End of master plan.*
