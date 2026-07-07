# Gap audit — living register

**Last reconciled:** 2026-07-06 (Sprint P0)  
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
| SRC-08 | Multi-page thumbnail strip | P3 | open | Sprint L18 |

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
| TOOL-RD-02 | Glossary popover on hover | P2 | open |
| TOOL-RD-03 | Reprocess for pre-2.4 garbled Greek | P2 | open (runtime repair mitigates) |
| TOOL-RD-04 | OCR correction + re-anchor spans after reprocess | P2 | open |

### Annotations (`Επισημάνσεις`)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-AN-01 | Margin panel, realtime sync, Agent handoff | — | shipped |
| TOOL-AN-02 | Conflict resolution UI (concurrent edits) | P2 | open |
| TOOL-AN-03 | OCR span re-anchor after reprocess | P2 | open |

### Scratchpad (`Πρόχειρο`)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-SP-01 | Formula solver, whiteboard export, Agent explain | — | shipped |
| TOOL-SP-02 | SymPy symbolic simplification (offline) | P3 | open |
| TOOL-SP-03 | Unit/dimension checker | P3 | open |

### Concept Map (`Χάρτης εννοιών`)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| TOOL-CM-01 | Edit graph, undo, PNG export, Reader jump | — | shipped |
| TOOL-CM-02 | Redo stack | P2 | open |
| TOOL-CM-03 | PMI edge labels | P2 | open |
| TOOL-CM-04 | Keyboard a11y + screen-reader tree | P2 | open |
| TOOL-CM-05 | CRDT multi-user editing | P3 | open |

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
| TOOL-SM-02 | Course-specific preset scenarios | P2 | open |
| TOOL-SM-03 | Graph export → Whiteboard | P2 | open |
| TOOL-WB-01 | Layers, KaTeX, PNG/SVG, Agent diagram coach | — | shipped |
| TOOL-TM-01 | Pomodoro, exam countdown, .ics | — | shipped |
| TOOL-TM-02 | Auto-suggest Leitner on break | P2 | open |
| TOOL-PR-01 | Readiness ring, tool activity breakdown | — | shipped |
| TOOL-PR-02 | Per-tool time-on-tool (engagement timestamps) | P2 | open |
| TOOL-PR-03 | Export progress report PDF | P2 | open |

### Cross-tool

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| XTL-01 | Glossary refresh on reprocess | P2 | **shipped** | `regenerateGlossaryAfterReprocess` + stale bump |
| XTL-02 | Feynman / Compare / Debate dedicated Agent chips | P2 | **shipped** | `WorkspaceToolAgentChipBar` |
| XTL-03 | Expand `@testing-library/react` component tests | P2 | open |

---

## Five pillars beyond MVP

### 1. Operational completeness

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| OPS-01 | Retention cron: purge `audit_logs` > 24mo | P1 | open |
| OPS-02 | Retention cron: purge `transcribe_jobs` > 90d | P1 | open |
| OPS-03 | Account deletion cascade job | P1 | open |
| OPS-04 | Signed iOS/Android release builds (Fastlane) | P1 | open |
| OPS-05 | Live privacy policy URL (not `synapse.example.com`) | P1 | open |
| OPS-06 | Legal review + DPA counsel sign-off | P1 | open |
| OPS-07 | LTI grade passback — production AGS (not stub) | P2 | open |

### 2. Multi-device continuity

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| MD-01 | Client PDF thumbnails (L17) | P1 | shipped |
| MD-02 | Server-side thumbnail CDN (L19+) | P3 | open |
| MD-03 | Server-side RAG index for cross-device retrieval | P2 | open |
| MD-04 | Leitner deck sync via `/v1/session` | P1 | shipped (partial) |
| MD-05 | Image-as-thumbnail for `type: image` | P2 | open |

### 3. AI-native polish

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| AI-01 | Studio generation states | P1 | **shipped** | See STU-03 |
| AI-02 | Persistent Ask AI rail in tool overlay | P1 | **shipped** | See STU-04 |
| AI-03 | One-click quiz / mindmap Studio actions | P1 | **shipped** | See STU-05/06 |
| AI-04 | Agent chips on Feynman / Compare / Debate | P2 | **shipped** | See XTL-02 |
| AI-05 | `VITE_SHOW_NOTEBOOKLM_PARITY` default strategy | P2 | open |

### 4. Collaboration depth

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| COL-01 | L9-3 assignment discussion threads (full Q&A) | P2 | stub |
| COL-02 | Annotation conflict resolution UI | P2 | open |
| COL-03 | Concept map CRDT | P3 | open |
| COL-04 | Collaborative whiteboard shared state | P3 | open |
| COL-05 | L9-4 LTI NRPS roster sync (not stub) | P2 | stub |

### 5. Doc/code single source of truth

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| DOC-01 | `PRODUCT_SCALE_STATUS.md` ↔ code | P0 | shipped (P0 sprint) |
| DOC-02 | `ARCHITECTURE.md` extension points (teacher UI shipped) | P2 | open |
| DOC-03 | `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md` D3 drift | P2 | open |
| DOC-04 | `PRODUCT_SCALE_PLAN.md` doc backlog checkboxes | P2 | open |
| DOC-05 | This file updated each sprint close-out | P0 | ongoing |

---

## MCP & platform

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| MCP-01 | SSE streaming for `generate_quiz` | P2 | open |
| MCP-02 | Client reader for `mcpFlashcards` / `mcpAnnotations` | P2 | open |
| MCP-03 | OAuth persistence in Postgres (multi-instance) | P2 | open |
| PLT-01 | Cross-page UI sweep (`PLATFORM_UI_UX_MASTER_PLAN.md`) | P2 | open |
| PLT-02 | OpenTelemetry + Helm IaC | P3 | open |
| PLT-03 | Offline embeddings (transformers.js) | P3 | open |

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
- `WORKSPACE_TOOLS_UPGRADE.md` — exhaustive per-tool spec
- `docs/NOTEBOOKLM_WORKSPACE_UI.md` — notebook layout phases
- `docs/SPRINT_L17_PDF_SOURCE_THUMBNAILS.md` — thumbnail pipeline
- `ROADMAP.md` · `L8_KICKOFF.md` · `docs/compliance/RETENTION.md`

*Maintainers: update **Last reconciled** date and move rows to **shipped** when closing gaps.*
