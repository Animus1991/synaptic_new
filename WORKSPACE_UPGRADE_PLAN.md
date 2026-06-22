# Study Workspace — Product Launch Upgrade Plan

Per-tool roadmap for personalized, note-grounded tools. Each phase ships only when
the prior foundation is stable (tests + `hasSource` gate preserved).

**Foundation (Phase W0 — done):** `workspaceFocus` bus, cross-tool term
highlighting, reader deep-links from concept map / glossary.

**Phase W1 batch 1 (done):** Reader dyslexia/TTS/focus; Leitner keyboard; Compare focus;
Concept map → reader.

**Phase W1 batch 2 (done):** Scratchpad ↔ Whiteboard (`ScratchpadExport`, KaTeX preview);
Reader inline annotations + MD/JSON export.

**Phase W1 batch 3 (done):** Feynman gap → reader span; Debate claim → excerpt;
Generic numeric sandbox; Timer ↔ concept + step binding.

**Phase W1 batch 4 (done):** Annotations margin notes + focus term tags + export;
Lesson rail deep-link tool buttons per step.

**Phase W2 (done):** Shared correlation bus (`workspaceCorrelation`), adaptive step order
from mastery, Anki export, PNG concept map, shared teacher annotations (server),
exam countdown timer, E2E deep-link tests.

| Tool | Current | Phase W2 (research-grade) |
|------|---------|---------------------------|
| **Reader** | Bionic, dyslexia, TTS, inline annotations, export | Translation side-by-side |
| **Annotations** | Margin panel, term tags, reader deep links, MD/JSON export, **shared teacher notes** | Realtime sync |
| **Lesson rail** | Step → tool deep links, **adaptive order from mastery** | Spaced step scheduling |
| **Concept map** | Drag, mastery, → reader, **PNG export** | Force layout |
| **Leitner** | FSRS + keyboard 1–4, **Anki export** | Deck sync |
| **Compare** | Focus-term highlight | CSV export |
| **Scratchpad** | KaTeX + → whiteboard | CAS graph plot |
| **Whiteboard** | Scratchpad import + KaTeX | Layers |
| **Feynman** | Rubric + coach + gap → reader | Rubric export PDF |
| **Debate** | Tree + claim → reader | Counter-argument add |
| **Sandbox** | Econ + generic numeric cues | Course presets |
| **Timer** | Concept/step label + session log, **exam countdown** | Calendar sync |

| Tool | Current | Phase W3 (next) |
|------|---------|-----------------|
| **Reader** | Bionic, TTS, annotations, **glossary + LLM side-by-side translation** | Full-source bilingual sync scroll |
| **Annotations** | Shared teacher notes | Realtime sync |
| **Lesson rail** | Adaptive order from mastery | Spaced step scheduling |
| **Concept map** | Drag, PNG, **force-directed layout (focus anchor)** | Hierarchical layers |
| **Leitner** | Anki export | Deck sync |
| **Compare** | Focus-term highlight, **CSV export** | Sortable columns |
| **Scratchpad** | KaTeX + whiteboard | CAS graph plot |
| **Whiteboard** | Scratchpad import | Layers |
| **Feynman** | Gap → reader | Rubric export PDF |
| **Debate** | Claim → reader | Counter-argument add |
| **Sandbox** | Numeric cues | Course presets |
| **Timer** | Exam countdown | Calendar sync |

**Phase W3 batch 1 (done):** Reader translation side-by-side (glossary bus + optional LLM);
Compare CSV export; Concept map force layout anchored on `workspaceFocus` / concept.

**Phase W4 (done):** Reader bilingual sync scroll; Compare sortable columns (focus-term
priority via correlation bus); Whiteboard layers v2 (`WhiteboardDocument` + migration);
Feynman rubric HTML/PDF export; Debate counter-arguments grounded on `readerText` +
`workspaceFocus`.

**Phase W5 (done):** Reader paragraph-aligned bilingual sync + focus-term jump;
Annotations realtime poll + `BroadcastChannel` + versioned server API;
Lesson rail spaced step scheduling (`spacedStepSchedule` + due badges);
Concept map hierarchical layers + layout/filter via prerequisite depth.

| Tool | Current | Phase W5 (done) |
|------|---------|-----------------|
| **Reader** | Bilingual ratio scroll | **Paragraph-aligned sync** + focus jump |
| **Annotations** | Teacher notes fetch | **Realtime sync** (poll + live badge) |
| **Lesson rail** | Adaptive mastery order | **Spaced scheduling** + due badges |
| **Concept map** | Force layout | **Hierarchical layers** + filter |

**Phase W6 (done):** Leitner deck sync + due-queue heatmap (FSRS spacing bus);
Scratchpad CAS graph plot; Timer calendar .ics export; Annotations SSE stream
with poll fallback; Reader paragraph TTS + scroll-follow.

| Tool | Current | Phase W6 (done) |
|------|---------|-----------------|
| **Leitner** | Anki export | **Deck sync** + **due heatmap** |
| **Scratchpad** | KaTeX + whiteboard | **Graph plot** |
| **Timer** | Exam countdown | **Calendar .ics** export |
| **Annotations** | Poll realtime | **SSE stream** (+ poll fallback) |
| **Reader** | Selection TTS | **Paragraph TTS** + scroll follow |

**Phase W7 (done):** Quiz IRT calibration + adaptive item selection; Sandbox parameter
sensitivity heatmap; Whiteboard LaTeX stamp library; Compare diff highlighting + annotated
CSV export; Command palette cross-tool macros (correlation bus).

| Tool | Current | Phase W7 (done) |
|------|---------|-----------------|
| **Quiz** | MC / matching / ordering | **IRT adaptive** difficulty |
| **Sandbox** | Sliders + insight | **Sensitivity heatmap** |
| **Whiteboard** | Layers + scratchpad import | **LaTeX stamp library** |
| **Compare** | Sort + CSV | **Diff highlight** + annotated CSV |
| **Command palette** | Tools / layout | **Cross-tool macros** |

**Phase W8 (done):** Discoverability panel (correlation chips + per-tool guides);
Quiz multi-item session + confidence rating; Feynman voice input + auto-gap from rubric;
Debate interactive rebuttal graph; Concept map collaborative cursors (SSE);
Reader OCR overlay for scanned uploads.

| Tool | Current | Phase W8 (done) |
|------|---------|-----------------|
| **Discoverability** | — | **Correlation bar + feature guide + quick actions** |
| **Quiz** | IRT adaptive | **Multi-item session + confidence 1–5** |
| **Feynman** | Rubric + gap → reader | **Voice input + auto-gap panel** |
| **Debate** | Counter-args | **Rebuttal graph** |
| **Concept map** | Force + hierarchy | **Collaborative cursors (SSE)** |
| **Reader** | Paragraph TTS | **OCR overlay toggle** |

## Infra epics — worth vs now
|------|-------------------|---------------------|----------------|
| BullMQ/S3 ingestion | Yes at scale | Client worker + localStorage OK for &lt;500 users | **Defer** until upload p95 &gt;90s or multi-GB files |
| Postgres `source_documents` | Yes for re-ingest audit | `UploadedFile` + course merge works | **Partial**: add columns via migration when `DATABASE_URL` set |
| pgvector RAG | Yes for large corpora | Client BM25 + server `/v1/rag/query` sufficient for single-course | **Defer** until corpus &gt;2k chunks per user |
| LTI/SAML | Yes for universities | Manual auth + teacher dashboard enough for pilots | **Defer** until 1 institutional pilot signed |
| xAPI warehouse | Yes for analytics team | `learningEvents` localStorage sufficient | **Defer**; export JSON endpoint first |
| Layout OCR | Yes for scanned slides | Tesseract path works for MVP | **Phase 7** when OCR quality complaints &gt;10% |
| Stanza NER Docker | Yes for EL quality | Hook + sidecar stub exist | **Enable** when `NER_SERVICE_URL` in prod |
