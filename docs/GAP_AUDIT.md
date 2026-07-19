# Gap audit — living register

**Last reconciled:** 2026-07-15 (Wave 2 closed: SM-02/03, PR-02/03)  
**Canonical pair:** this file (open gaps) + `PRODUCT_SCALE_STATUS.md` (what ships)  
**North star:** *NotebookLM to understand · Synapse to retain + teacher visibility*

Update this document when a gap closes or a new one is discovered. Do **not** duplicate shipped status here — link to `PRODUCT_SCALE_STATUS.md` instead.

---

## How to use

| Column | Meaning |
| ------ | ------- |
| **ID** | Stable reference (`NW-01`, `SRC-03`, `TOOL-QZ-02`) |
| **Priority** | P0 blocker · P1 ship-quality · P2 depth · P3 horizon |
| **Status** | `open` · `in-progress` · `shipped` · `wontfix` |
| **Sprint** | Target sprint label when assigned |

**Regression gates** (run after workspace changes):

```bash
npm run typecheck
npm test -- src/lib/pdfThumbnail.test.ts src/lib/sourceThumbnailPersist.test.ts src/lib/thumbnailBackfill.test.ts src/lib/workspaceToolAgentPrompts.test.ts
cd server && npm test
npx playwright test e2e/notebook-workspace.spec.ts e2e/source-thumbnail.spec.ts
```

---

## P0 — Doc truth & regression (Sprint P0)

| ID | Item | Status | Notes |
| -- | ---- | ------ | ----- |
| P0-01 | Reconcile `PRODUCT_SCALE_STATUS.md` (L17 + notebook workspace) | **shipped** | Jul 2026 |
| P0-02 | Reconcile `NOTEBOOKLM_WORKSPACE_UI.md` header | **shipped** | Jul 2026 |
| P0-03 | E2E helper `openReaderInWorkspace` / `openToolInWorkspace` | **shipped** | 5 specs migrated |
| P0-04 | L17-7 `features.l17Enterprise.pdfThumbnails` health probe | **shipped** | `productionProbe.ts` |
| P0-05 | Create this living `GAP_AUDIT.md` | **shipped** | Jul 2026 |
| P0-06 | Migrate remaining dock-only E2E specs | **shipped** | quiz-workspace, workspace-empty-tools, a11y-canvas |
| P0-07 | L17 manual QA checklist (6 scenarios) | **shipped** | `e2e/source-thumbnail.spec.ts` — 9 automated scenarios |

---

## Notebook Workspace UI — Sources · Chat · Studio

Surfaces from the default 3-panel layout (`notebookMode` ON).

### Sources panel (`Πηγές`)

| ID | Item | Priority | Status | Acceptance |
| -- | ---- | -------- | ------ | ---------- |
| SRC-01 | Pin active source at top of list | P1 | **shipped** | Pin icon + reorder; first source default |
| SRC-02 | Source guide (AI) — full grounding on active file | P1 | shipped | `source guide` in Sources column |
| SRC-03 | Quality strip + reprocess CTA | P1 | shipped | Shows % + pipeline version warning |
| SRC-04 | PDF page-preview thumbnail (L17) | P1 | shipped | `source-thumbnail-preview` or typed chip |
| SRC-05 | Legacy PDF without blob → reprocess UX copy | P1 | **shipped** | Notebook source row hint + E2E (P2b) |
| SRC-06 | Add source flow from Sources panel | P1 | shipped | Upload / paste in workspace |
| SRC-07 | Citation jump from chat → reader highlight | P1 | shipped | `sourceHighlight` overlay |
| SRC-08 | Multi-page thumbnail strip | P3 | **shipped** | `PdfPageThumbnailStrip` in notebook sources |

### Chat panel (`Συνομιλία`)

| ID | Item | Priority | Status | Acceptance |
| -- | ---- | -------- | ------ | ---------- |
| CHAT-01 | Inline Agent (no nav redirect) | P0 | shipped | `Agent embedded` in center panel |
| CHAT-02 | Compact context chip (hover popover) | P1 | shipped | `AgentContextBanner compact` |
| CHAT-03 | Socratic / grounded mode badges | P1 | shipped | Mode + source labels visible |
| CHAT-04 | Citation chips → reader jump | P1 | shipped | Slide/page reference opens reader |
| CHAT-05 | Auto-focus chat input on workspace open | P1 | **shipped** | `autoFocusInput` on embedded Agent |
| CHAT-06 | Classic layout inline chat drawer | P2 | **shipped** | `ClassicChatDrawer` — no redirect when `notebookMode` off |
| CHAT-07 | «Πλήρης προβολή» full Agent page | P1 | shipped | `fullPage: true` only |

### Studio panel (`Studio` — 12 tools)

| ID | Item | Priority | Status | Acceptance |
| -- | ---- | -------- | ------ | ---------- |
| STU-01 | 12 tool cards + overlay surface | P0 | shipped | All tools reachable, zero removal |
| STU-02 | Ask AI sparkle → pre-filled chat prompt | P1 | shipped | `buildToolDefaultAgentPrompt` |
| STU-03 | Generation states (audio overview, mind map) | P1 | **shipped** | `studio-action-audio-overview` + quiz/mindmap `data-generation-state` |
| STU-04 | Persistent «Ask AI» rail in tool overlay | P1 | **shipped** | `notebook-studio-ask-ai-rail` |
| STU-05 | One-click «Φτιάξε κουίζ» Studio action | P1 | **shipped** | `studio-action-quiz-from-source` |
| STU-06 | One-click «Mind map από πηγή» | P1 | **shipped** | `studio-action-mindmap-from-source` |
| STU-07 | Visual regression screenshot (notebook layout) | P1 | **shipped** | `e2e/notebook-workspace.spec.ts` snapshot |
| STU-08 | Mobile bottom tabs Sources \| Chat \| Studio | P1 | shipped | `notebook-mobile-tabs` |

---

## Workspace tools — per-tool depth (`WORKSPACE_TOOLS_UPGRADE.md`)

Goal: every tool **fully functional for its learning purpose**, not demo stubs.

### Reader (`Ανάγνωση`)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-RD-01 | Structured segments, TTS, bilingual sync | — | shipped |
| TOOL-RD-02 | Glossary popover on hover | P2 | **shipped** | Hover delay + click/focus; `reader-glossary-popover` |
| TOOL-RD-03 | Reprocess for pre-2.4 garbled Greek | P2 | **shipped** | `pre24GreekReprocess` detect + status bar CTA; reprocess stamps current pipeline |
| TOOL-RD-04 | OCR correction + re-anchor spans after reprocess | P2 | **shipped** | `readerAnnotationReanchor.ts` / `reanchorOcrCorrections` + CognitiveReader effect on source change |

### Annotations (`Επισημάνσεις`)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-AN-01 | Margin panel, realtime sync, Agent handoff | — | shipped |
| TOOL-AN-02 | Conflict resolution UI (concurrent edits) | P2 | **shipped** | `AnnotationConflictPanel` + `mergeSharedAnnotationsWithConflicts`, revision PATCH 412 |
| TOOL-AN-03 | OCR span re-anchor after reprocess | P2 | **shipped** | See TOOL-RD-04 / `reprocessCourseReaderAnnotations` |

### Scratchpad (`Πρόχειρο`)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-SP-01 | Formula solver, whiteboard export, Agent explain | — | shipped |
| TOOL-SP-02 | SymPy symbolic simplification (offline) | — | **shipped** | `simplifyExpressionWithSympy` + scratchpad Simplify CTA |
| TOOL-SP-03 | Unit/dimension checker | — | **shipped** | `unitDimensionChecker.ts` wired in FormulaScratchpad |

### Concept Map (`Χάρτης εννοιών`)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-CM-01 | Edit graph, undo, PNG export, Reader jump | — | shipped |
| TOOL-CM-02 | Redo stack | P2 | **shipped** | `redoStack` + `concept-map-redo` in `DraggableConceptMap` |
| TOOL-CM-03 | PMI edge labels | P2 | **shipped** | `pmi` on edges + `formatConceptMapEdgeGlyph` |
| TOOL-CM-04 | Keyboard a11y + screen-reader tree | P2 | **shipped** | Arrow nav + `role=tree` with `aria-level` |
| TOOL-CM-05 | CRDT multi-user editing | P3 | **shipped** | Yjs/Hocuspocus via study room |

### Feynman · Compare · Debate

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-FY-01 | Rubric, gap → reader jump | — | shipped |
| TOOL-FY-02 | Dedicated «Open Quiz» chip post-rubric | P2 | **shipped** | P3 sprint |
| TOOL-FY-03 | Agent auto-send from weakest dimension | P2 | **shipped** | `onAskAgentWithPrompt` + autoSend |
| TOOL-CP-01 | Sortable columns, diff mode, CSV | — | shipped |
| TOOL-CP-02 | Visual diff highlighting | P2 | **shipped** | `ComparisonTable` diff mode |
| TOOL-CP-03 | Agent «Explain difference between X and Y» | P2 | **shipped** | `compare-explain-difference` |
| TOOL-DB-01 | Grounded argument tree | — | shipped |
| TOOL-DB-02 | User-added rebuttal nodes (persisted) | P2 | **shipped** | `ArgumentMap` + IDB |
| TOOL-DB-03 | Agent Socratic challenge on claim | P2 | **shipped** | `onAskAgent` + chips |

### Quiz · Leitner · Simulator · Whiteboard · Timer · Progress

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-QZ-01 | Session flow, IRT, post-session CTAs | — | shipped |
| TOOL-QZ-02 | Open Feynman on wrong-answer cluster | P2 | **shipped** | `quiz-review-feynman-cluster` |
| TOOL-QZ-03 | Server-side attempt history | P2 | **shipped** | `/v1/session` `quizAttemptHistories` |
| TOOL-LT-01 | FSRS, Anki export, cross-device deck sync | — | shipped |
| TOOL-SM-01 | Sliders, sensitivity hints | — | shipped |
| TOOL-SM-02 | Course-specific preset scenarios | P2 | **shipped** | `simulatorCoursePresets` + UI chips |
| TOOL-SM-03 | Graph export → Whiteboard | P2 | **shipped** | `simulatorWhiteboardBridge` + CTA |
| TOOL-WB-01 | Layers, KaTeX, PNG/SVG, Agent diagram coach | — | shipped |
| TOOL-TM-01 | Pomodoro, exam countdown, .ics | — | shipped |
| TOOL-TM-02 | Auto-suggest Leitner on break | P2 | **shipped** | Break banner + `onOpenBreakTool` → Leitner |
| TOOL-PR-01 | Readiness ring, tool activity breakdown | — | shipped |
| TOOL-PR-02 | Per-tool time-on-tool (engagement timestamps) | P2 | **shipped** | `toolTimeTracker` + MiniDashboard chips |
| TOOL-PR-03 | Export progress report PDF | P2 | **shipped** | print HTML/PDF + dwell ms in export |

### Cross-tool

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| XTL-01 | Glossary refresh on reprocess | P2 | **shipped** | `regenerateGlossaryAfterReprocess` + stale bump |
| XTL-02 | Feynman / Compare / Debate dedicated Agent chips | P2 | **shipped** | `WorkspaceToolAgentChipBar` |
| XTL-03 | Expand `@testing-library/react` component tests | P2 | **shipped** | Concept map + Reader glossary RTL tests |

---

## Five pillars beyond MVP

### 1. Operational completeness

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| OPS-01 | Retention cron: purge `audit_logs` > 24mo | P1 | shipped |
| OPS-02 | Retention cron: purge `transcribe_jobs` > 90d | P1 | shipped |
| OPS-03 | Account deletion cascade job | P1 | shipped |
| OPS-04 | Signed iOS/Android release builds (Fastlane) | P1 | shipped |
| OPS-05 | Live privacy policy URL (not `synapse.example.com`) | P1 | shipped |
| OPS-06 | Legal review + DPA counsel sign-off | P1 | ready |
| OPS-07 | LTI grade passback — production AGS (not stub) | P2 | **shipped** | PG line items + passback log, launch bind, retry; live POST when token/line item present |

### 2. Multi-device continuity

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| MD-01 | Client PDF thumbnails (L17) | P1 | shipped |
| MD-02 | Server-side thumbnail CDN (L19+) | P3 | shipped |
| MD-03 | Server-side RAG index for cross-device retrieval | P2 | shipped |
| MD-04 | Leitner deck sync via `/v1/session` | P1 | shipped (partial) |
| MD-05 | Image-as-thumbnail for `type: image` | P2 | **shipped** | `renderImageCoverThumbnail` + ingest/backfill |

### 3. AI-native polish

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| AI-01 | Studio generation states | P1 | **shipped** | See STU-03 |
| AI-02 | Persistent Ask AI rail in tool overlay | P1 | **shipped** | See STU-04 |
| AI-03 | One-click quiz / mindmap Studio actions | P1 | **shipped** | See STU-05/06 |
| AI-04 | Agent chips on Feynman / Compare / Debate | P2 | **shipped** | See XTL-02 |
| AI-05 | `VITE_SHOW_NOTEBOOKLM_PARITY` default strategy | P2 | **shipped** | override → env → DEV on / prod off; Settings Developer toggle |

### 4. Collaboration depth

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| COL-01 | L9-3 assignment discussion threads (full Q&A) | P2 | shipped |
| COL-02 | Annotation conflict resolution UI | P2 | **shipped** | See TOOL-AN-02 — `AnnotationConflictPanel` wired in AnnotationOverlay |
| COL-03 | Concept map CRDT | P3 | **shipped** | `conceptMapCrdt.ts`, `useConceptMapCollab` |
| COL-04 | Collaborative whiteboard shared state | P3 | **shipped** | `whiteboardCrdt` + `useWhiteboardCollab` → StudyWhiteboard |
| COL-05 | L9-4 LTI NRPS roster sync (not stub) | P2 | shipped |

### 5. Doc/code single source of truth

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| DOC-01 | `PRODUCT_SCALE_STATUS.md` ↔ code | P0 | shipped (P0 sprint) |
| DOC-02 | `ARCHITECTURE.md` extension points (teacher UI shipped) | P2 | **shipped** (Wave 5, 2026-07-16) |
| DOC-03 | `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md` D3 drift | P2 | **shipped** (historical header + D3 reconciled) |
| DOC-04 | `PRODUCT_SCALE_PLAN.md` doc backlog checkboxes | P2 | **shipped** (Wave 5 partial; remaining open items tracked in §12) |
| DOC-05 | This file updated each sprint close-out | P0 | **shipped** (Wave 5 + Wave G close-out) |

---

## FigmaSynaptic UX transfer (Wave C)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| UX-01 | Tasks Command Center (4 tabs + session launchers + daily progress) | P1 | **shipped** | `Tasks.tsx` refresh |
| UX-02 | Sidebar Active Course Card + Quick Access strip | P1 | **shipped** | `Shell.tsx`, `shellUxContent.ts`, `index.css` tokens |
| UX-03 | Note Analysis Pipeline (5 stages + algorithm transparency) | P1 | **shipped** | `NoteAnalysisView.tsx`, `noteAnalysisSnapshot.ts` |
| UX-04 | Progress / confidence calibration / learner insights | P2 | **shipped** | `progressInsights.ts`, `ProgressInsightsSections.tsx`, `Analytics.tsx` |
| UX-05 | Agent mode visual catalog + source mode toggle | P2 | **shipped** | `AgentModeSidebar.tsx`, `agentCatalog.ts`, `Agent.tsx` |
| UX-06 | Exam Simulator fullscreen flow | P2 | **shipped** | `ExamPrepView.tsx` fullscreen setup/live/review/results flow |
| UX-07 | Onboarding wizard (user type, goal, exam date) | P3 | **shipped** | `Onboarding.tsx`, `onboardingContent.ts` |
| UX-08 | Live Engine transparency tool (client-side BM25/TextRank) | P3 | **shipped** | `LiveEngineTransparencyPanel.tsx`, `NoteAnalysisView.tsx`, `noteAnalysisSnapshot.ts` |

---

## MCP & platform

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| MCP-01 | SSE streaming for `generate_quiz` | P2 | **shipped** | `Accept: text/event-stream` / `stream:true` progress SSE |
| MCP-02 | Client reader for `mcpFlashcards` / `mcpAnnotations` | P2 | **shipped** | `McpCourseArtifactsPanel` on Course Sources |
| MCP-03 | OAuth persistence in Postgres (multi-instance) | P2 | **shipped** | `google_oauth_tokens` + `mcp_oauth_clients` |
| PLT-01 | Cross-page UI sweep (`PLATFORM_UI_UX_MASTER_PLAN.md`) | P2 | **shipped** | PLT-01A entry flows · PLT-01B course/tasks/agent clarity · PLT-01C design-system sweep |
| OPT-A | Option-B Phase A aesthetic polish | P2 | **shipped** | `platformChrome` (SectionHeader, UxCallout, TrustBadgeRow, SessionLauncherCard, HeroGlow); Tasks danger zone + session cards; Dashboard callouts; Agent trust badges; **slice 2:** CourseView section headers + callouts; Workspace dashboard/discoverability next-action callouts |
| OPT-B | Option-B Phase B analytics visuals | P2 | **shipped** | B1: Sankey + Waterfall · B2: Concept treemap + Learning timeline · B3: Standalone concept mastery heatmap (21-day matrix on Mastery tab) |
| OPT-C | Option-B Blueprint theme | P2 | **shipped** | 4th theme `blueprint`; glass palette, floating orbs, inverted CTAs, analytics `blueprint-surface`; dark/light/spectrum unchanged |
| WS-C | Workspace Phase C — pedagogy lens + split + tour | P2 | **shipped** | Theory/Practice/Balanced lens toggle; split lesson layout; lesson content emphasis; first-visit workspace `ProductTour` (7 steps) |
| PLT-11 | L11 discoverability — FSRS due queue + plugin marketplace | P2 | **shipped** | `LeitnerDueQueuePanel` card variant on Dashboard + Tasks reviews; `buildGlobalFsrsDueQueue`; marketplace hook badges + `UxCallout` |
| OPT-D1 | Option-B Wave D1 — blueprint micro-polish | P2 | **shipped** | Timeline pulse dots; blueprint toast skin; dashboard `gradient-text` subtitle; eyebrow `0.34em` |
| OPT-D2 | Option-B Wave D2 — BlueprintSurface + glass nesting | P2 | **shipped** | `BlueprintSurface` component; `blueprint-surface-nest` / `hint`; header EN/ΕΛ pill; Leitner flip depth; Dashboard + split workspace nesting |
| OPT-D3 | Option-B Wave D3 — descriptive tabs + bento glass | P2 | **shipped** | `DescriptiveStickyTabBar` on Tasks; tab summaries; all Dashboard `ws-bento` → `BlueprintSurface` |
| OPT-D4 | Option-B Wave D4 — Library InfoStack + live preview + CourseView tabs | P2 | **shipped** | `InfoStack` on Library; `DashboardLivePreview`; `DescriptiveStickyTabBar` on Library + CourseView |
| OPT-E1 | Option-B Wave E1 — Shell trust badges + quick wins | P2 | **shipped** | `SynapseBrandGlyph`; `HeaderTrustBadgeRow` (source/PWA/offline); `MiniAlert`; Shell header wiring; blueprint scrollbar + trust badge CSS |
| OPT-E3 | Option-B Wave E3 — ws-bento → BlueprintSurface sweep | P2 | **shipped** | Platform-wide glass parity: workspace tools, visuals, Agent, Library list/cards, `Card`/`StatTile` primitives, `ws-bento-soft` → `hint` |
| OPT-E2 | Option-B Wave E2 — blueprint CTA + motion + typography | P2 | **shipped** | `ux-primary-cta` / `ux-secondary-cta` inverted glass; `useBlueprintTheme` + prototype fadeUp in `MotionSection`; eyebrow 0.34em; sans headings on blueprint |
| OPT-E4 | Option-B Wave E4 — agent bubbles + toast + chips | P2 | **shipped** | Cyan/glass `agent-message-bubble-*`; `ux-agent-chip` follow-ups; cyan glass toast stack + bottom-right `AppToastBanner`; proactive strip glass alignment |
| OPT-E5 | Option-B Wave E5 — modal/form glass + library drop + tasks danger | P2 | **shipped** | `ux-modal-panel` on Confirm/Upload/Reprocess; `ux-upload-drop-zone` + `ux-library-drop-zone`; blueprint `ux-callout-danger` amber panel |
| OPT-E6 | Option-B Wave E6 — workspace deep sweep | P2 | **shipped** | `workspace-glass-panel` Notebook + ClassicChatDrawer; blueprint `ux-workspace-tool-tab`; workspace main bg glass |
| OPT-E7 | Option-B Wave E7 — diagram/chart micro-polish | P2 | **shipped** | `BlueprintSvgDefs` gradient strokes; `AnalyticsVisualLabPanel`; treemap/heatmap/waterfall blueprint hovers |
| OPT-E8 | Option-B Wave E8 — Inter-only blueprint headings | P2 | **shipped** | Blueprint h1–h3 + `.ws-serif` → sans; `.ux-section-eyebrow` 0.34em; mega `.ux-card` radius |
| OPT-E9 | Option-B Wave E9 — Settings/Onboarding/Teacher glass + blueprint default | P2 | **shipped** | `ux-flow-shell` / `ux-flow-panel` on Settings, Onboarding, Teacher; glass inputs + progress; `resolveInitialThemePreference()` → blueprint for new production users |
| OPT-E10 | Option-B Wave E10 — decorative SVG boards | P2 | **shipped** | `SourceFlowDiagram` + `RetentionSparklineBoard` in Analytics Visual Lab; `decorativeSparklines` helpers; blueprint node/sparkline hovers |
| OPT-E11 | Option-B Wave E11 — Tier-B tool internals glass | P2 | **shipped** | `ux-tier-b-tool` sweep on CognitiveReader, FormulaScratchpad, WorkspaceQuiz/Session; toolbar/nav/panel/option blueprint glass |
| OPT-E12 | Option-B Wave E12 — route transitions + shimmer skeletons | P2 | **shipped** | `PlatformViewTransition` blueprint fadeUp; `UxShimmerSkeleton` on lazy overlay, tools, upload preview, teacher/student loading |
| OPT-E13 | Option-B Wave E13 — hero live build preview + pipeline rail | P2 | **shipped** | `DashboardHeroSteps`; `DashboardBuildPipelinePreview`; `DashboardLivePreviewWatches`; blueprint xl hero grid on Dashboard |
| OPT-E15 | Option-B Wave E15 — Color Coding System reference | P2 | **shipped** | `ColorCodingReferencePanel` + `colorCodingReference.ts` in Settings; semantic swatches via `--mastery-*` / `--palette-*`; 60-30-10 rule bar |
| OPT-E14 | Option-B Wave E14 — Visual Lab 6-mode rail + decorative boards | P2 | **shipped** | `visualLabModes.ts`; mode tabs in `AnalyticsVisualLabPanel`; `VisualLabDecorativeBoards`; source mapping tiles |
| OPT-E16 | Option-B Wave E16 — Leitner FSRS box rail chrome | P2 | **shipped** | `LeitnerFsrsBoxRail`; xl sidebar layout in `LeitnerBox`; blueprint flip card radius + meter styling |
| OPT-E17 | Option-B Wave E17 — Pomodoro timer visual chrome | P2 | **shipped** | `PomodoroRing`; `PomodoroSessionModeList`; xl ring + mode cards in `StudyTimer`; `ux-pomodoro-*` blueprint glass + cyan ring |
| OPT-E18 | Option-B Wave E18 — Landing blueprint variant polish | P2 | **shipped** | `landing-page` semantic shell; blueprint hero orbs + glass frames; inverted CTAs; `SynapseBrandGlyph` + trust badges; Inter headings via `.landing-display` |
| OPT-F1 | Wave F1 — Landing Cinobo clarity + type density | P2 | **shipped** | `--landing-type-*` tokens; `landing-hero-title` / `landing-section-title`; compact `landing-cta`; FAQ scale; `landingCtaMicrocopy` |
| OPT-F2 | Wave F2 — Blueprint landing quiet luxury | P2 | **shipped** | Floating `.landing-hero-orbs`; blueprint trust line; hide feature corner dots; `--ux-radius-hero` glass panels |
| OPT-F3 | Wave F3 — App chrome density | P2 | **shipped** | `ux-page-header` / `ux-section-header` / `ux-stat-value` scale down; blueprint `gradient-text` subtitle inherit |
| OPT-OB-μ1 | Option-B micro — hero radius unification | P3 | **shipped** | `--ux-radius-hero: 2rem` on blueprint `ux-card` + `blueprint-surface` + live preview |
| OPT-OB-μ3 | Option-B micro — landing orbs float | P3 | **shipped** | `platform-blueprint-float` on blueprint `.landing-hero-orbs` pseudo-elements |
| OPT-F4 | Wave F4 — Landing mid-page CTA strip | P2 | **shipped** | `.landing-mid-cta` between social proof and FAQ; hero CTA repeat; `landingMidCtaTitle` i18n |
| OPT-OB-μ4 | Option-B micro — dashboard hero lens chip | P3 | **shipped** | `DashboardHeroLensChip` decorative pill on blueprint dashboard hero; no workspace wiring |
| OPT-OB-μ8 | Option-B micro — Visual Lab heading alignment | P3 | **shipped** | `dashboard-preview-title` shared scale; `visual-lab-panel-header` + board head spacing |
| WS-01 | Workspace empty states (`§2.7`) — learning outcome + CTA per tool | P1 | **shipped** | `WorkspaceToolEmptyState` + `buildWorkspaceEmptyView`; all 16 tools wired; E2E `workspace-empty-tools.spec.ts` |
| PLT-02 | OpenTelemetry + Helm IaC | P3 | **shipped** | `telemetry.ts`, `/live`/`/ready`, `server/helm/` |
| PLT-03 | Offline embeddings (transformers.js) | P3 | **shipped** | `localEmbedder.ts` + recognition worker preload |

---

## Aesthetic backlog — post Option-B / Cinobo / F4 (Jul 2026)

**Option-B production parity:** ~100% (OPT-A → OPT-F4, OB-μ1/μ2/μ3/μ4/μ8 shipped). No hidden Option-B gaps remain — only frosting, architectural hygiene, or Replit-inspired clarity passes.

### Wontfix (aesthetic)

| ID | Status | Notes |
| -- | ------ | ----- |
| OPT-OB-μ5 | **wontfix** | Emoji Visual Lab tabs — prod uses Lucide + `visualLabModes` |
| OPT-OB-μ6 | **wontfix** | 5-box Leitner — prod uses 4 FSRS buckets |
| OPT-OB-μ7 | **wontfix** | Source annotation overlay — demo-only prototype |

### Open — architectural hygiene (hypothetical)

| ID | Item | Priority | Status | Notes |
| -- | ---- | -------- | ------ | ----- |
| OPT-G | Global app density tokens (`--type-hero`, `--btn-height`) | P3 | **shipped** | `@theme` tokens; wired to landing hero, page headers, CTA min-height |
| OPT-H | `marketing-page` vs `app-shell` CSS namespace split | P3 | **shipped** | `.landing-page` / `.app-shell` scoped `--ux-type-hero`, `--ux-btn-height`, `--ux-namespace-surface` |
| OPT-I | Unified `fadeUp` motion stagger | P3 | **shipped** | `uxFadeUp` keyframe; `MotionSection` unified 12px/0.6s + `--ux-motion-stagger-step` |

### Open — Cinobo micro (low ROI)

| ID | Item | Priority | Status | Notes |
| -- | ---- | -------- | ------ | ----- |
| OPT-CIN-μ1 | Landing nav quieter on smaller breakpoints | P3 | **shipped** | See OPT-CIN-μ1 in Replit waves table |
| OPT-CIN-μ2 | How-it-works title → `landing-section-title` | P3 | **shipped** | See OPT-CIN-μ2 in Replit waves table |

### Open — Cinobo micro (low ROI)

_All Cinobo micro items shipped (Jul 2026)._

### Replit-inspired clarity waves (aesthetic only)

Constraints for all OPT-R*: no typography/button/modal scale-up; no functional removals; blueprint cyan identity preserved; no orange palette import.  
**SSoT (residual R9+):** `docs/REPLIT_CLARITY_ENHANCEMENT_PLAN.md` (coexists with Primer M* + ChatGPT-calm C*).

| ID | Item | Priority | Status | Notes |
| -- | ---- | -------- | ------ | ----- |
| OPT-R1 | Wave R1 — calm/spark rhythm + light border-over-shadow | P2 | **shipped** | `ux-spark-panel` / `ux-calm-panel`; light `platform-panel-*` + `ux-card` border-only; `landing-spark-card` |
| OPT-R2 | Wave R2 — prompt-bar chrome + ghost pill polish | P2 | **shipped** | `ux-prompt-bar-surface` on upload/library; ghost pill radius on `ux-secondary-cta`; light prompt input |
| OPT-R3 | Wave R3 — Tasks Kanban visual columns + card frames | P2 | **shipped** | `TasksKanbanStatusStrip`; column counts; `tasks-kanban-card` status dots; list logic untouched |
| OPT-R4 | Wave R4 — Agent describe-rail + preview frame chrome | P2 | **shipped** | `AgentFlowRail`; `ux-canvas-frame` on live preview, pipeline preview, Visual Lab board |
| OPT-R5 | Wave R5 — OPT-H namespace + tracking tokens | P3 | **shipped** | `--surface-canvas` alias; namespace `--ux-tracking-*`; heading letter-spacing via tokens only |
| OPT-R6 | Wave R6 — Landing intent chips + trust strip | P3 | **shipped** | `LandingIntentChips`; `LandingTrustStrip`; `ux-semi-mono-eyebrow` on landing labels |
| OPT-R7 | Wave R7 — empty states + modal header stack | P3 | **shipped** | `platform-empty-state` border card; `ModalHeaderStack`; light `--focus-ring-color` on app-shell |
| OPT-R8 | Wave R8 — nav accent indicator + Visual Lab lane dividers | P3 | **shipped** | Sidebar left accent bar; mobile underline; `visual-lab-mode-rail-lanes` column dividers |
| OPT-R10 | Wave R10 — prompt-first create/upload chrome | P2 | **shipped** | `create-prompt` UploadModal; paste/YouTube in `CollapsibleChromeSection`; quiet `post-upload-create`; `replit-clarity.css` |
| OPT-R11 | Wave R11 — Status-as-console + pipeline strip | P2 | **shipped** | Bottom console dock; Errors/Activity groups; inbox console chrome; thin RAG `pipeline-console-strip` |
| OPT-R13 | Wave R13 — workspace/notebook canvas primacy | P2 | **shipped** | `workspace-canvas` + `notebook-canvas`; Files/AI/Tools hierarchy labels under Minimal; denser Sources list |
| OPT-R18 | Wave R18 — capture harness demo-course seed | P2 | **shipped** | Atomic explore-demo seed; `ensureCaptureDemoCourse` for M20/C8; paste fallback |
| OPT-R9, R12, R14–R17 | Residual create/canvas/console program | P2 | **planned** | See `REPLIT_CLARITY_ENHANCEMENT_PLAN.md` §6; next R12 |

### Primer-inspired minimal (OPT-M) — zero feature removal

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| OPT-M0 | Lock doc + principles (not GitHub clone) | P2 | **shipped** | `docs/PRIMER_MINIMAL_THEME.md` |
| OPT-M1 | Themes `minimal` / `minimal-dark` + Settings + cycle | P2 | **shipped** | tokens in `index.css`; Settings; ThemeToggle |
| OPT-M2 | Chrome thinning via collapsible secondary chrome | P2 | **shipped** | `CollapsibleChromeSection`; ToolFrame + ConceptLens |
| OPT-M3 | Gate orbs / glow / heavy motion under minimal* | P2 | **shipped** | CSS + `useMinimalTheme` / MotionSection |
| OPT-M4 | Flat CTAs / calm panels / border-first cards | P2 | **shipped** | shared minimal overrides in `index.css` |
| OPT-M5 | Theme defaults + tests (superseded by M13) | P2 | **shipped** | Was Blueprint; M13 flipped default to Minimal |
| OPT-M6 | Chrome density Comfortable/Compact + `data-density` | P2 | **shipped** | Settings; `chromeDensity.ts`; EL defaults comfortable |
| OPT-M7 | Classic chrome overflow parity + Status inbox | P2 | **shipped** | classic menu; ContextBar `statusInbox` |
| OPT-M8 | Zen discoverability + landing/app orb split | P2 | **shipped** | Zen chip label; landing orbs mild under minimal |
| OPT-M9 | Unified strip bus (OCR/QA/stale → Status) + screenshot matrix | P2 | **shipped** | `workspaceStatusBus`; `WorkspaceStatusPanel`; matrix doc |
| OPT-M10 | Visual regression checklist (Minimal vs Blueprint) | P2 | **shipped** | `docs/PRIMER_MINIMAL_SCREENSHOT_MATRIX.md` (manual capture; no feature gate) |
| OPT-M11 | Modal/overlay border-first under minimal; fab hardcode cleanup | P2 | **shipped** | `index.css` OPT-M11; `StudyWorkspaceOverlays`; `concept-lens-chip` |
| OPT-M12 | Dashboard/Tasks/Agent progressive disclosure under minimal | P2 | **shipped** | Alerts / flow rail / quick actions collapsible; due-queue collapsed by default |
| OPT-M13 | Minimal as production default (pre-launch) | P2 | **shipped** | `DEFAULT_THEME_PREFERENCE = minimal`; Blueprint remains selectable |
| OPT-M14 | App-shell surface polish under Minimal | P2 | **shipped** | Library/Analytics/Teacher + Exam tip / Note engine / Student Org hints |
| OPT-M16 | Global ⌘K + `?` help parity | P2 | **shipped** | Shell search badge; shell `?` variant; workspace keeps full map |
| OPT-M17 | App-level Status/Inbox | P2 | **shipped** | NotificationsPanel hosts toast + proactive alerts; bell badge includes them |
| OPT-M15 | CSS hygiene / theme-scoped extract | P2 | **shipped** | `src/styles/primer-minimal.css` + `docs/PRIMER_MINIMAL_CSS_INVENTORY.md` |
| OPT-M18 | Content-first Course empty states | P2 | **shipped** | Path + Sources `PlatformEmptyState` |
| OPT-M19 | System preference → Minimal family | P2 | **shipped** | `system` → `minimal` / `minimal-dark` |
| OPT-M20 | Screenshot matrix launch QA | P2 | **process** | `npm run capture:primer-minimal` dumps PNGs; human Pass? still ☐ |
| OPT-C0 (calm) | ChatGPT-calm CSS tokens (Minimal-gated) | P2 | **shipped** | `src/styles/chatgpt-calm.css`; see `docs/CHATGPT_MINIMAL_ENHANCEMENT_PLAN.md` (not Blueprint OPT-C) |
| OPT-C1 (calm) | Agent centered thread + soft bubbles + composer | P2 | **shipped** | `Agent.tsx` column/composer; modes/citations retained |
| OPT-C3 (calm) | Quiet shell nav (subtitles → tooltip) | P2 | **shipped** | Minimal: single-line labels, `w-56` rail; all `nav-*` kept |
| OPT-C4 (calm) | Notebook chat column calm parity | P2 | **shipped** | `notebook-calm` + softer chat/studio chrome; 3-panel IA intact |
| OPT-C2 (calm) | Mode UI quieting + regenerate | P2 | **shipped** | Minimal: muted mode colors; `agent-regenerate`; modes 100% reachable |
| OPT-C5 (calm) | Dashboard/Library soft lists | P2 | **shipped** | `dashboard-calm` / `library-calm`; list-first default when no prefs |
| OPT-C8 (calm) | Calm screenshot matrix + capture | P2 | **harness** | `npm run capture:chatgpt-calm` → `artifacts/chatgpt-calm/`; human Pass? in matrix |
| OPT-C6 (calm) | Enterprise/Settings calm headers | P2 | **shipped** | `enterprise-calm` + quieter `ux-page-header`; theme hint Minimal vs Blueprint |
| OPT-C7 (calm) | Mobile composer + drawer labels | P2 | **shipped** | ≥40px targets; quiet workspace hint under Minimal; safe-area nav |

### Replit study — explicit non-borrows

Do **not** port: `#ff3c00` orange, ABC Diatype, 48–69px displays, 40–60px marketing radii, 100px app pills, warm cream on blueprint, infinite canvas UX, Kanban backend, shadow-heavy elevation.

---

## Suggested sprint sequence (post-P0)

| Sprint | Focus | Key IDs |
| ------ | ----- | ------- |
| **P1** | Notebook polish | SRC-01, CHAT-05, STU-03–07 |
| **P2** | Tool depth wave | TOOL-FY-02, TOOL-CP-03, TOOL-QZ-02/03, XTL-01/02 | **shipped** (P3 sprint Jul 2026) |
| **P3** | Enterprise ops | OPS-01–03, COL-01, COL-05 |
| **P4** | Distribution | OPS-04–06 (parallel) |
| **P5** | Horizon | MD-02/03, COL-03, PLT-02 |

---

## References

- `PRODUCT_SCALE_STATUS.md` — shipped truth
- `docs/INFRA_HARDENING_BLUEPRINT.md` — **SSoT for technical infrastructure hardening** (security, multi-instance, SLOs, per-element INFRA-* cards, waves W0–W6). Product/UX gaps stay here; infra execution follows that blueprint.
- `WORKSPACE_TOOLS_UPGRADE.md` — exhaustive per-tool spec
- `docs/NOTEBOOKLM_WORKSPACE_UI.md` — notebook layout phases
- `docs/SPRINT_L17_PDF_SOURCE_THUMBNAILS.md` — thumbnail pipeline
- `ROADMAP.md` · `L8_KICKOFF.md` · `docs/compliance/RETENTION.md`

*Maintainers: update **Last reconciled** date and move rows to **shipped** when closing gaps.*
