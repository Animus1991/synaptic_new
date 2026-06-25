# STATE-OF-THE-ART MASTER UPGRADE PROMPT — Synapse Learning Platform

> **Single deliverable.** This document is the authoritative, exhaustive upgrade prompt for taking the entire web platform — and especially the **Study Workspace** — from its current state to **state-of-the-art, product-launch-ready** quality. It is written to be executed by an advanced AI coding agent (Cursor / Windsurf / equivalent) over multiple disciplined passes.
>
> It is **grounded in the real codebase** (Zustand `useAppStore`, the `AppView` view-switch in `src/App.tsx`, the 12-tool `workspaceToolRegistry`, `workspaceContextModel`, `sanitizeStepTitle`, the overlay flows, and the existing doc set). It is not generic.

---

## 0. HOW TO USE THIS DOCUMENT (meta-instructions for the executing agent)

You are acting simultaneously as: principal full-stack engineer, senior frontend architect, senior backend architect, UI/UX systems designer, EdTech product architect, learning-science specialist, document-intelligence engineer, QA lead, accessibility specialist, and launch-readiness reviewer.

**Operating rules:**

1. **Depth over speed.** Speed is explicitly *not* the priority. Correctness, coherence, maintainability, learning value, source fidelity, and launch readiness are.
2. **One track at a time, in the priority order of §15.** Before each track: read the real files, write a ≤5-line plan, implement, run `npm run typecheck:all` + `npm run test`, then report *files changed / tests / what remains*.
3. **Never widen scope silently.** If a change touches the shared store or domain model, state the blast radius first.
4. **Prefer deletion / merging over adding UI.** A control that cannot answer the §16 questionnaire is removed, merged, hidden, or deferred — not shipped.
5. **Bilingual always.** Every user-facing string uses the existing i18n convention (`t(key, lang)` via `I18nContext`, or the `lang === 'el' ? 'Ελληνικά' : 'English'` pattern, or `t('Ελληνικά','English')` where that hook is used). No hard-coded single-language UI text.
6. **Source-truth discipline.** Never let any tool present low-confidence / corrupted extraction as authoritative. Confidence flows everywhere (§2, §13).
7. **No regression.** Existing passing tests must stay green. New behavior ships with new tests.

**Definition of "done" for any feature:** it reads from the shared store, writes learning signals through the shared event path, honors source confidence, has loading/empty/error states, works on mobile, is accessible, is bilingual, has tests, and updates Progress + Concept Bus where relevant.

---

## 1. CURRENT REAL STATE (do not rebuild these)

The codebase is already mature. Confirmed real artifacts the agent must **extend, not duplicate**:

- **State:** `src/store/useStore.ts` (`useAppStore`, Zustand) is the de-facto shared correlation store. It already exposes: `navigate`, `currentView`, `recordQuizAttempt`, `submitLeitnerRating`, `logStudyMinutes`, `reprocessCourseMaterial`, `removeUploadedFile`, `queueConceptBusSync` / `flushConceptBusSync`, `openStudyWorkspaceForConcept`, `startTask` / `startSession`, `learnerModel`, `pedagogyMetrics` (conceptBars, repairs, calibration, openMistakes), `dashboardStats`, `uploadedFiles`, `glossaryEntries`, `courses`.
- **View switch:** `src/App.tsx` renders by `store.currentView` (`AppView`) inside `Shell`, plus full-screen overlays gated by booleans (`studyWorkspaceOpen`, `activeLessonView`, etc.).
- **Workspace tool system:** `src/lib/workspaceToolRegistry.ts` — `WORKSPACE_TOOLS` (12, bilingual `label`/`labelEl`/`desc`/`descEl`), `PRIMARY_WORKSPACE_TOOLS`, `SECONDARY_WORKSPACE_TOOLS`, `WORKSPACE_TOOL_GROUPS`, helpers `workspaceToolLabel` / `workspaceToolDescription`. Consumers: `WorkspaceDock`, `WorkspaceToolStrip`, `WorkspaceMobileToolDrawer`, `WorkspaceMobileIntelligenceTabs`.
- **Workspace context:** `src/lib/workspaceContextModel.ts` (`buildWorkspaceContextBreadcrumb`, `displayWorkspaceStepTitle`, `isLowConfidenceStepTitle`) + `WorkspaceContextStrip` (Course / Section / Step / Tool breadcrumb with low-confidence `AlertTriangle`).
- **Title quality:** `src/lib/workspaceStepTitleQuality.ts` (`isGarbageStepTitle`, `sanitizeStepTitle`, `collapseRepeatedPhrases`).
- **Existing intelligence components:** `ConceptBusPanel`, `WeakAreasFocusRail`, `WorkspaceDiscoverabilityPanel`, `WorkspaceLearningActionBar`, `WorkspaceSourceStatusBar`, `OcrCorrectionPanel`, `WorkspaceToolCrossLinkBar`, `ConceptLensPanel`.
- **Per-tool panels:** `QuizPanel`/`WorkspaceQuiz`/`WorkspaceQuizSession`, `LeitnerPanel`/`LeitnerBox`, `TimerPanel`/`StudyTimer`, `SimulatorPanel`/`InteractiveSimulator`, `DebatePanel`/`ArgumentMap`, `ComparePanel`, `WhiteboardPanel`/`StudyWhiteboard`, `ScratchpadNotesPanel`/`FormulaScratchpad`, `DashboardPanel`/`MiniDashboard`, `CognitiveReader`, `DraggableConceptMap`, `FeynmanCheck`, `AnnotationOverlay`, `LessonContent`.
- **Pipeline:** `noteContentExtractors.ts`, `greekTextRepair.ts`, `readerTableLayout`, formula/LaTeX + bibliography + front-matter detection, source-quality scoring, `regenerateTasksAfterReprocess`.
- **Document mgmt entry points:** `ReprocessPreviewModal`, `ReuploadMigrationBanner`, `SourceQualityBanner`, `store.removeUploadedFile`.
- **Existing docs:** `PRODUCT_UPGRADE_MASTER_PLAN.md`, `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md`, `WORKSPACE_UPGRADE_PLAN.md`, `WORKSPACE_TOOLS_UPGRADE.md`, `STUDY_WORKSPACE.md`, `FUNCTION_CATALOG.md`, `ALGORITHMS.md`, `CONTENT_PIPELINE.md`, `AGENT_RAG.md`, `PROMPT_PACK_AUDIT.md`, `ARCHITECTURE.md`, `API.md`, `PERSISTENCE.md`, `I18N.md`, `TESTING.md`, `SECURITY.md`, `ROADMAP.md`, `PRODUCT_SCALE_PLAN.md`.

---

## 2. THE ARCHITECTURAL SPINE — "NO ISOLATED FEATURES"

The platform must behave as **one system**, not a drawer of unrelated tools. Formalize the shared layer on top of `useAppStore`.

### 2.1 `WorkspaceContext` (single source of truth for "where am I")
One typed context object derived in the store and consumed by every workspace surface:
```
{ courseId, documentId, processingVersion, sectionId, stepIndex/stepCount,
  activeTool, activeConcept, selection, sourceQuality, lowConfidenceSection }
```
- Header breadcrumb, stepper, Agent context, Concept Bus, and tool panels **read this** — they never derive their own copy. (`workspaceContextModel` already starts this; finish wiring it so the "Βήμα 4/8 vs 8/8" and stale-breadcrumb classes of bug cannot recur.)

### 2.2 `LearningEvent` log (the common correlation database)
A single append-only event stream in the store:
```
LearningEvent = { id, ts, type, conceptId?, sectionId?, toolId?, confidence, payload }
```
Event types (deliberate actions only — no passive noise):
`quiz.answered`, `card.reviewed`, `feynman.submitted`, `annotation.created`, `confusion.marked`, `compare.generated`, `debate.generated`, `sim.completed`, `timer.completed`, `whiteboard.saved`, `scratchpad.saved`, `reader.section.completed`.

### 2.3 Derived selectors (pure, unit-tested) — everything else is a *view*
`masteryByConcept()`, `weakConcepts()`, `nextBestAction()`, `toolActivity()`, `examReadiness()`, `sourceCoverage()`.
- **Progress / MiniDashboard, Concept Bus, Weak Areas, Next-Action, Analytics** become projections of these selectors. They must **not** each recompute mastery independently.
- **Acceptance:** a single `quiz.answered` event with `correct:false` instantly updates Weak Areas, Concept Bus mastery, Next-Action recommendation, MiniDashboard chips, and Analytics — with zero bespoke wiring per surface. Add an integration test asserting this fan-out.

### 2.4 Source confidence propagation
Every `ExtractedSection`, derived `Concept`, generated quiz/card/sim, and `LearningEvent` carries a `confidence ∈ [0,1]`, downgraded when traced to a low-quality section (e.g. 37/100) or a `collapseRepeatedPhrases`/`isGarbageStepTitle`-flagged fragment. Tools render caution (amber `AlertTriangle`, "πιθανό σφάλμα εξαγωγής / possible extraction error") instead of teaching corrupted text, and the agent refuses to assert corrupted content as fact.

---

## 3. GLOBAL CROSS-CUTTING STANDARDS (apply to every page below)

For **every** page/overlay/tool, the agent enforces:

- **States:** explicit loading (skeleton), empty (actionable CTA), error (recoverable), and offline/degraded states. No blank panels.
- **Visual hierarchy:** one obvious primary action per screen; secondary actions demoted; calm spacing; branded palette (`brand-*`, `accent-*`, `surface-*`, `text-*` tokens already in the design system) — no cheap micro-text (`text-[8px]`), no equal-weight tool walls.
- **i18n:** bilingual EL/EN everywhere; numbers/dates localized; no truncated Greek that changes meaning.
- **Accessibility:** semantic roles, `aria-label`/`aria-current`, focus-visible rings, ≥44px touch targets, keyboard operability, color-contrast AA, respects reduced-motion.
- **Mobile-first responsive:** every surface has a coherent narrow-viewport layout (the workspace already has `WorkspaceMobileToolDrawer` / `WorkspaceMobileIntelligenceTabs` — extend, don't bypass).
- **Microcopy honesty:** replace raw machine metrics (`ability 0.00`, `P≈27%`, `difficulty 1.00`) with explained, human language + tooltip with the raw value.
- **Telemetry:** deliberate interactions emit `LearningEvent`s (§2.2).
- **Tests:** unit (logic), component (render + states), and at least one integration test per page proving store wiring.

---

## 4. PAGE — Landing (`Landing.tsx`)
**Purpose:** convert a first-time visitor; communicate the product promise.
**Upgrade prompt:**
- Sharpen the value proposition for the real product (AI study workspace grounded in *your own* uploaded notes; source-faithful; exam-ready). Hero, 3 proof points, one primary CTA → `onboarding`.
- Add social-proof / outcomes section, FAQ, footer with legal links (privacy, terms) — gated behind real backend where needed (§14).
- Bilingual, responsive, reduced-motion safe, Lighthouse-clean.
**Acceptance:** loads <2.5s LCP target; single primary CTA; no dead links; tests for CTA → onboarding nav.

## 5. PAGE — Onboarding (`Onboarding.tsx`)
**Steps:** `welcome → role → goals → preferences → upload`.
**Upgrade prompt:**
- Make `role` (student/teacher) drive downstream UX (teacher → §12). Persist to `user.settings`.
- `goals`/`preferences` must actually configure the learner model (exam date → `daysToExam`, study intensity, language, accessibility prefs like dyslexia/bionic defaults).
- `upload` step shares the real `UploadModal`/`processUpload` pipeline (no parallel uploader). On success → `course` view.
- Progress indicator, back/skip, validation, empty/error states.
**Acceptance:** completing onboarding seeds settings + (optional) first course; re-entrant; tested.

## 6. SHELL & GLOBAL NAV (`Shell.tsx`, `CommandPalette.tsx`, `NotificationsPanel.tsx`, `SessionQueueBar.tsx`, `AppToastBanner.tsx`)
**Upgrade prompt:**
- **Sidebar nav** items (`dashboard, library, tasks, agent, analytics, teacher, settings`): clear active state, collapsible, keyboard nav, role-aware (`teacher` only for teachers). Breadcrumb must reflect real `WorkspaceContext`, not `capitalize(currentView)`.
- **Command Palette (⌘K):** single source for navigation + tool launch + content search (`globalContentSearch`). De-duplicate any action that also lives elsewhere. Fuzzy search, recent, grouped results, keyboard-first.
- **Notifications:** real activity feed with read/unread, deep-links into the owning surface.
- **Session queue bar / toasts:** consistent, dismissible, accessible (aria-live).
**Acceptance:** every nav target reachable from palette; breadcrumb correct on every view; tested.

## 7. PAGE — Dashboard (`Dashboard.tsx`)
**Purpose:** the daily "what should I do now" hub.
**Upgrade prompt:**
- Lead with **Next Best Action** (from §2.3 `nextBestAction()`), not vanity stats.
- Cards: today's tasks, due reviews (FSRS), weak areas, days-to-exam, mastery delta, anti-passive alert — all projections of shared selectors.
- Each stat is explainable (tooltip with definition) and links to the surface that can act on it.
- Remove decorative/gamified noise that has no learning action attached.
**Acceptance:** every dashboard widget deep-links to an action; no metric without meaning; tested fan-out from a `quiz.answered` event.

## 8. PAGE — Library (`Library.tsx`) + tabs (`courses`, files) + grid/list view
**Upgrade prompt:**
- **Materials manager** is the home of file lifecycle: per-file row actions **Reprocess / Re-upload / Delete (`removeUploadedFile`) / Inspect extraction / View source quality**. Confirm destructive actions with cascade explanation (§11).
- Course cards show source-quality badge + "old pipeline" flag + counts (concepts, tasks, due cards) from shared selectors.
- Grid/list toggle, search, sort, filter by quality/recency. Empty + loading + error states.
**Acceptance:** a user can delete and re-upload a file to get upgraded recognition without orphaned UI; tested.

## 9. PAGE — CourseView (`CourseView.tsx`) + tabs (`path`, …)
**Upgrade prompt:**
- Learning **path** view: ordered topics → each links into Study Workspace at the right section/tool. Show mastery per topic (shared selector), prerequisites, and "next" affordance.
- Surface source files for the course with the same lifecycle actions as Library (`onRemoveFile`, `onReprocessMaterial`, `onUploadMore`).
- Course-level source-quality banner + reprocess CTA when stale.
**Acceptance:** topic → workspace deep-link preserves context; reprocess regenerates topics/tasks via `regenerateTasksAfterReprocess`; tested.

## 10. PAGE — Tasks (`Tasks.tsx`)
**Upgrade prompt:**
- Clarify task types (lesson, practical, review, exam-prep, mistake-retry, prerequisite-repair) with consistent iconography and one primary action each.
- Integrate open mistakes + due reviews; "start session" batches related tasks.
- Days-to-exam urgency framing; expandable detail; empty/error states.
**Acceptance:** starting any task routes to the correct overlay with correct context; tested.

## 11. UPLOAD & DOCUMENT LIFECYCLE (`UploadModal.tsx`, `ReprocessPreviewModal.tsx`, `ReuploadMigrationBanner.tsx`, `SourceQualityBanner.tsx`)
**Steps:** `upload → configure → processing → error`.
**Upgrade prompt:**
- **Delete / remove** uploaded files everywhere they appear, with a confirmation that explains the cascade: original file, extracted text, chunks/embeddings, generated lessons, quizzes/cards/sims/tasks, progress impact, annotations/scratchpad/whiteboard impact, and reversibility.
- **Reprocess** creates a new `processingVersion`: regenerates sections/topics/concepts/tasks (`regenerateTasksAfterReprocess`), **flags stale** generated quizzes/cards/sims, carefully preserves user annotations/scratchpad (remap or mark "stale" with a visible flag), updates source-quality score + pipeline version.
- **Re-upload / replace** runs the upgraded pipeline and shows a **before→after extraction diff** so the user can *see* the recognition improvement.
- Configure step: language, OCR toggle, document type hints, exam date.
**Acceptance:** delete leaves no orphaned UI; reprocess/re-upload paths covered by tests including stale-content flagging.

## 12. DOCUMENT INTELLIGENCE / OCR / EXTRACTION (`noteContentExtractors.ts`, `greekTextRepair.ts`, pipeline libs)
**Upgrade prompt — "max-grade text recognition":**
- Per-format extractors: PDF text-layer → OCR fallback; image / screenshot / image-only PDF → OCR; DOCX; PPTX; TXT; Markdown.
- Greek-aware post-repair chain (`greekTextRepair`, `collapseRepeatedPhrases`, `sanitizeStepTitle`, `readerTableLayout`, math→LaTeX, bibliography, front-matter). Multi-column handling.
- Detect & tag: document type, language, OCR need + confidence, table regions, math regions, front-matter, bibliography, section boundaries, **corrupted fragments**, low-quality sections, page references, processing version.
- Sub-scores behind the single quality number (text / table / math / structure / OCR / language) surfaced in UI.
- Corrupted fragments are excluded from quiz/card/sim generation and flagged inline (§2.4).
- Golden-file test corpus per format (esp. Greek academic PDFs, scanned notes, formula-heavy pages).
**Acceptance:** old low-quality docs are reprocessable to measurably higher quality; corrupted fragments never silently feed generators; tests cover suspicious fragments.

---

## 13. ⭐ STUDY WORKSPACE — DEEP, STATE-OF-THE-ART UPGRADE (primary focus)

`StudyWorkspace.tsx` (~2k lines) is the product's core. Treat it as a coherent IDE-for-learning. Every sub-surface below reads `WorkspaceContext` (§2.1) and emits `LearningEvent`s (§2.2).

### 13.0 Layout & zones (one calm, legible frame)
Required zones, in a clear hierarchy:
1. **Header / breadcrumb** (`WorkspaceContextStrip`): Course / Document / Section / Tool + source-quality status + Next-action + Weak + Concepts toggles. (Already exists — keep it the single context surface.)
2. **Source-status strip** (`WorkspaceSourceStatusBar`): old-pipeline + low-quality + reprocess + re-upload actions.
3. **Main learning surface:** the active tool.
4. **Context/intelligence panel:** Concept Bus, Weak areas, Discoverability, source links, Next action.
5. **Agent panel:** contextual tutor, collapsible.
6. **Tool navigation:** dock (grouped launcher) + primary tool strip + ⌘K for the rest; mobile drawer on small screens.
**Acceptance:** a user understands *where they are, what section, what's next, whether source is reliable, which tool is active* within 5 seconds; long-reading is comfortable; mobile is coherent.

### 13.1 Tool navigation de-duplication (P1)
- **One canonical model:** `workspaceToolRegistry` is the only tool source. The **dock** is a grouped, icon+label launcher (now bilingual via `workspaceToolLabel(id, lang)`); the **`WorkspaceToolStrip`** shows `PRIMARY_WORKSPACE_TOOLS` + a "More"/⌘K affordance for `SECONDARY_WORKSPACE_TOOLS`. The dock and strip must **not** both render all 12 tools as equal competitors.
- **Naming normalization (single label per tool, no collisions):** Reader=`Ανάγνωση`, Concept Map=`Χάρτης εννοιών`, Scratchpad=`Πρόχειρο`, Whiteboard=`Πίνακας σχεδίασης`, Flashcards=`Κάρτες`, Feynman=`Feynman`, Quiz=`Κουίζ`, Simulator=`Προσομοίωση`, Compare=`Σύγκριση`, Debate=`Συζήτηση`, Timer=`Χρονόμετρο`, Annotations=`Επισημάνσεις`, Progress=`Πρόοδος`. Ensure **no two tools share a label** (the historical duplicate `Σημειώσεις` for both Annotations and Scratchpad must be gone everywhere — registry, strip, dock, mobile drawer, command palette).
- **Acceptance:** no duplicate labels in any nav surface; dock/strip roles distinct; tested.

### 13.2 Context strip / breadcrumb (`WorkspaceContextStrip` + `workspaceContextModel`)
- Always show Course / Section / Step / Tool from `WorkspaceContext`. Low-confidence sections show the amber warning and a safe fallback title (`sanitizeStepTitle` + `collapseRepeatedPhrases` already added). Step counter must match the real flow length (no 4/8 vs 8/8 mismatch).
- **Acceptance:** breadcrumb never shows corrupted/duplicated headings; step count consistent across header, stepper, agent.

### 13.3 Intelligence rail
- **Concept Bus (`ConceptBusPanel`):** active concept, related, prerequisites, source sections, per-tool activity (deliberate events only), mastery status, weak reason, and per-concept actions (open in Reader / explain / quiz / cards / Feynman / compare / debate / whiteboard / mark confusing / mark mastered). Projection of shared selectors.
- **Weak Areas (`WeakAreasFocusRail`):** explainable weakness reasons (quiz error, low confidence, marked confusing, failed card, weak Feynman, sim mistake, low source confidence), each with a one-tap remediation.
- **Discoverability (`WorkspaceDiscoverabilityPanel`):** surfaces tools the learner hasn't used for the current concept, contextually (not nagging).
- **Next Action (`WorkspaceLearningActionBar`):** the `nextBestAction()` engine — one primary action + ≤3 secondary, with reason + linked section/concept + expected outcome. Rules: low quality → reprocess; old pipeline → reprocess/re-upload; not studied → study; studied not tested → test; failed → explain/retry weak; confusing → ask agent/Feynman; passed → cards/next; cards due → review; sim due → practice.
- **Acceptance:** rail is a coherent projection; recommendations update after each event; tested rule matrix.

### 13.4 Per-tool upgrades (each: reads context, emits events, honors confidence, shares the selection-action contract)

**A. Reader / Cognitive Reader (`CognitiveReader.tsx`, `LessonContent.tsx`)** — the source-truth surface.
- Clean long-reading; logical sections (not corrupted chunks); source citations; suspicious-fragment warnings; OCR correction entry (`OcrCorrectionPanel`); selection actions (annotate / ask agent / make card / quiz / compare / debate / scratchpad).
- Cognitive modes must be *useful, labeled, honest*: Standard, Full-extracted, Translation (labeled AI-generated), Bionic (preserves Greek accents + math), Heatmap (must encode something real: concept density / weak areas / exam relevance / source-quality / confusion), Dyslexia/accessibility (no medical overclaim), Sections, Source-quality view.
- **Acceptance:** readable + source-faithful; modes are not gimmicks; mobile reading works; tested mode-switch + low-quality behavior.

**B. Concept Map (`DraggableConceptMap.tsx`)** — visualize concept links/prereqs from the shared graph; click a node → open in Reader / set active concept. Honors confidence (faded low-confidence nodes).

**C. Scratchpad (`ScratchpadNotesPanel.tsx`, `FormulaScratchpad.tsx`)** — temporary thinking, self-explanation, formula attempts, exam-answer drafts; clearly distinct from Annotations; save → `scratchpad.saved` event; convert selection → card/quiz.

**D. Whiteboard (`StudyWhiteboard.tsx`, `WhiteboardPanel.tsx`)** — concept/argument/comparison maps, formula derivation, graphs, flowcharts, timelines; clearly distinct from the table/data view; save → event; links to concept/reader.

**E. Flashcards / Leitner (`LeitnerBox.tsx`, `LeitnerPanel.tsx`)** — FSRS/Leitner spaced repetition; cards sourced from sections/annotations/quiz mistakes/Feynman gaps/compare/debate/sim mistakes; types (definition, formula, cloze, misconception, compare, exam-trap, example, argument, step-order); review loop updates Progress + weak-concept on failure; source-grounded with confidence flag.

**F. Feynman (`FeynmanCheck.tsx`)** — learner explains; AI detects gaps + misconceptions, suggests improved answer; `feynman.submitted` event updates mastery; source-aware, no hallucinated citations.

**G. Quiz / Knowledge Check (`WorkspaceQuiz.tsx`, `WorkspaceQuizSession.tsx`, `QuizPanel.tsx`)** — normalize the label (no Quiz/Κουίζ/Έλεγχος Γνώσεων/Δοκίμασέ-με confusion). Question types: MCQ, short answer, true/false+explanation, cloze, concept-distinction, formula-application, identify-mistake, ordering, exam-style. Feedback: correct/incorrect + explanation + source reference + misconception + weak-concept update + next action + "make card from mistake". **Explain raw metrics** in human language. Quiz must not steal Reader focus.

**H. Simulator (`InteractiveSimulator.tsx`, `SimulatorPanel.tsx`)** — realistic timed/oral/written exam practice on weak concepts and problem-solving; integrates Timer; `sim.completed` event; honors source quality.

**I. Compare (`ComparePanel.tsx`)** — side-by-side concepts/theories/formulas/cases: similarities, differences, exam traps, examples; follow-up quiz/cards; `compare.generated` event.

**J. Debate (`DebatePanel.tsx`, `ArgumentMap.tsx`)** — pro/con, theory-vs-theory, professor challenge, oral-exam, counterargument, synthesis; save to scratchpad; `debate.generated` event.

**K. Timer (`StudyTimer.tsx`, `TimerPanel.tsx`)** — focus/Pomodoro/timed-quiz/timed-sim/break/custom; records study minutes (`logStudyMinutes`) → Progress; `timer.completed` event.

**L. Annotations / OCR correction (`AnnotationOverlay.tsx`, `OcrCorrectionPanel.tsx`)** — source-grounded highlights (confusing / important / exam-relevant / formula-table-OCR-issue marks); distinct from Scratchpad; correcting extraction feeds the pipeline + raises confidence; `annotation.created` / `confusion.marked` events. Edits are overlays separate from original source; reprocess remaps or flags.

**M. Progress / MiniDashboard (`DashboardPanel.tsx`, `MiniDashboard.tsx`)** — real learning analytics, all projections of §2.3: source coverage, sections/concepts studied, weak concepts, quiz accuracy, card retention, Feynman attempts, sim score, study time, annotations, tool activity, reviews due, exam readiness. Chips honest (no fake precision), version-aware after reprocess.

### 13.5 Cross-link bar & selection-action contract (`WorkspaceToolCrossLinkBar.tsx`)
- A **single, consistent** action contract for any selected text/concept across all tools: *Annotate · Ask Agent · Make Card · Quiz · Compare · Debate · Scratchpad · Open in Reader*. Same affordances, same labels, everywhere.
- **Acceptance:** selection in Reader, Concept Map, or any panel offers the identical action set; tested.

### 13.6 Agent in the workspace (`Agent.tsx`, `AgentContextBanner.tsx`)
- Agent receives `WorkspaceContext` + weak concepts + active selection + source-confidence. Modes: direct, Socratic, beginner, exam-coach, hidden-steps, Feynman-evaluator, quiz/flashcard generator, compare/debate assistant, OCR-correction assistant, source-quality inspector, reprocess assistant, study planner.
- Warns on low source quality; distinguishes source vs AI enrichment; never hallucinates citations; always proposes a next learning action and routes to the owning tool.
- **Acceptance:** agent suggestions change with active tool/context; context-injection tested.

---

## 14. OVERLAY LEARNING FLOWS
`LessonView`, `PracticalLessonView`, `ReviewSessionView`, `MistakeRetryView`, `ExamPrepView`, `PrerequisiteRepairView`.
**Upgrade prompt:** each shares the same store, event log, source-confidence, and selection-action contract as the workspace; consistent header (close / agent / complete), progress, empty/error states, and post-completion routing to `nextBestAction()`. Eliminate divergent bespoke logic that recomputes mastery locally.
**Acceptance:** completing any flow emits the right events and advances the session; tested.

## 15. TEACHER MODE (`TeacherDashboard.tsx`) + COLLABORATIVE STUDY ROOMS (plan-first, backend-gated)
- **Teacher authoring:** create course, upload/write/edit notes (sections, math, tables, diagrams), add quizzes/cards/assignments, review AI content, publish lesson pack, invite students, **time-boxed access grants** (`accessStart`/`accessEnd`), revoke, track progress + common mistakes, duplicate/export. Requires roles, permissions, course ownership, student-access grants, publishing workflow, version history, access expiration, privacy. Must not pollute the student MVP UI.
- **Collaborative study rooms:** create/invite-by-link/join-by-code, shared timer/Pomodoro, quiet/break modes, individual + shared tasks, shared notes, optional whiteboard, in-room AI context, peer help, room history, privacy controls, report/block, temporary rooms. Cross-university allowed; private documents shared only with explicit consent. Realtime presence channel required.
- **Acceptance:** both planned with concrete data model + backend requirements; only ship UI when the backend exists; no half-finished social UI in the student MVP.

## 16. BACKEND / SECURITY / BILLING (`server/`, `API.md`, `SECURITY.md`)
**Upgrade prompt:** honest production roadmap — accounts/auth/sessions, document storage, processing/OCR jobs, RAG + embeddings, AI provider proxy + key vault, metering/billing/subscriptions, teacher courses + student access, collaborative rooms, permissions, orgs/classes, audit logs, deletion + reprocess jobs, observability, deployment. **Never claim production readiness unless real.** Separate client-ready from backend-ready. API keys never hard-coded or client-exposed.

---

## 17. PRIORITY SEQUENCING (execute in this order)

1. **P0 — Architectural spine** (§2): finalize `WorkspaceContext`, `LearningEvent` log, derived selectors; make Progress/ConceptBus/WeakAreas/NextAction/Analytics pure projections. *Foundational — unblocks coherence everywhere.*
2. **P1 — Workspace nav + naming de-duplication** (§13.1–13.2): dock vs strip roles, single label per tool, breadcrumb correctness.
3. **P2 — Source quality + corrupted-fragment gating** (§2.4, §12): confidence everywhere; exclude garbage from generators.
4. **P3 — Document lifecycle** (§11): delete / re-upload / reprocess with cascade + before→after diff.
5. **P4 — Max-grade extraction pipeline** (§12): per-format + Greek-aware + golden tests.
6. **P5 — Per-tool upgrades** (§13.4) tool-by-tool, each wired to the spine + selection-action contract (§13.5) + agent (§13.6).
7. **P6 — Overlay flows** (§14) unified to the spine.
8. **P7 — Page polish** (§4–§10) and Shell/nav (§6) to launch standard.
9. **P8 — Teacher mode** (§15a) once backend (§16) supports roles/permissions.
10. **P9 — Collaborative rooms** (§15b) once realtime backend exists.
11. **P10 — Backend/security/billing hardening** (§16) + full QA (§18) + launch report (§19).

## 18. TESTING & QA (`TESTING.md`, Vitest + Playwright)
Required: unit (selectors, sanitizers, pipeline), component (render + loading/empty/error), integration (store fan-out from a single event), reader-step round-trip, reprocess regenerates tasks (`regenerateTasksAfterReprocess`), delete leaves no orphan, low-quality banner, corrupted-fragment exclusion, quiz no-focus-steal, toolHitCounts, MiniDashboard chips, command-palette nav, mobile layout, accessibility. Existing tests stay green; failures documented honestly; launch blockers identified.

## 19. LAUNCH-READINESS REPORT (final pass)
Produce an objective report using labels: *Launch-ready · Needs polish · MVP-ready · Prototype · Partial · Planned-only · Broken · Remove/hide before launch*. Cover: what previous passes added, what is actually implemented vs only documented, page-by-page + tool-by-tool readiness, UI/UX, extraction, lifecycle, editable notes, teacher mode, collaboration, backend, tests, docs, security/privacy, launch blockers, recommended next sequence, what to remove/defer. Evaluate the **whole integrated system**, not features in isolation. Do not flatter; do not dismiss.

---

## 20. PER-FEATURE QUESTIONNAIRE (apply to every button / component / function)
For each control answer; if it can't, **redesign / merge / hide / defer / remove**:
1. What does it do? 2. Why does it exist? 3. Which learner problem does it solve? 4. Which page/tool owns it? 5. Which shared entity does it read? 6. Which it updates? 7. Which tools depend on it? 8. Updates Progress? 9. Updates Concept Bus? 10. Uses Reader/source context? 11. Depends on document quality? 12. Safe after reprocess? 13. Safe after deletion? 14. Has loading/empty/error states? 15. Works on mobile? 16. Accessible + bilingual? 17. Has tests? 18. Readiness label?

---

### Domain entities to formalize (reference for §2 & §16)
User · Workspace · Course · Document · SourceFile · ProcessingVersion · SourceQuality · ExtractedSection · ReaderStep · Concept · ConceptGraph · Annotation · ScratchpadEntry · AgentConversation · FeynmanAttempt · ComparisonSession · DebateSession · Quiz · QuizQuestion · QuizAttempt · Flashcard · FlashcardReview · SimulatorSession · WhiteboardBoard · TimerSession · ProgressRecord · LearningEvent · Task · ReprocessJob · DeletionJob · TeacherCourse · StudentAccessGrant · CollaborativeStudyRoom · ToolActivityEvent.
**Rules:** source content separate from AI-generated; user edits separate from original; AI enrichment labeled; generated artifacts know their `processingVersion`; reprocessed docs never silently keep stale tasks; progress is version-aware; deleted docs leave no orphans; teacher material is permissioned; rooms never expose private docs without explicit sharing.

---

*End of master upgrade prompt. Execute top-to-bottom by §17 priority. Report after every track.*
