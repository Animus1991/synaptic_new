# Roadmap & Gap Analysis

**Status baseline:** July 2026 — post Sprint 9 + **P0/P1/OCR/Sprint C/B/D** + **Phase 0 exam prep bundle**.
**Canonical snapshot:** [`PRODUCT_SCALE_STATUS.md`](PRODUCT_SCALE_STATUS.md)

This document separates **done**, **partial**, and **missing** against the product goal: *note-grounded adaptive learning at product scale, not MVP/demo-first.*

---

## Executive summary

| Layer | Completion | Notes |
| ----- | ---------- | ----- |
| Content engine (offline v2) | **~94%** | DocumentModel v2 + Vision OCR ingest path |
| Upload to course pipeline | **~94%** | Stage 1–3 quality gates; pipeline v2.5.1 |
| Study Workspace (13 tools) | **~95%** | P0 empty-state contract; Sprint C Agent handoff |
| Lesson surfaces | **~82%** | Step-grounded excerpts; concept lens; faithfulness gate |
| Tasks & pedagogy | **~83%** | Unified adaptive scheduler (S9-PR1); FSRS + mastery |
| Analytics & Dashboard | **~80%** | Behavior inference + Research tab; exam calendar + coverage + post-exam panels |
| RAG / Agent | **~90%** | Workspace context JSON + selection excerpt handoff |
| Recognition / OCR | **~92%** | Word-level overlay bboxes; Greek repair, Vision LLM, TrOCR, ocr-server |
| Client persistence | **~86%** | localStorage + IndexedDB; DocumentModel snapshots |
| Auth and full sync | **~82%** | JWT, library + session pull/push |
| Phase 6 server | **~88%** (dev) | Docker compose, Redis, pgvector, gradebook |
| Documentation | **~94%** | Reconciled Jul 2026 through Sprint B/D |
| Tests & CI | **~95%** | 926 unit tests; exam prep e2e smoke |
| i18n | **~90%** | UploadModal + RecognitionReportPanel; exam prep ~135 keys |
| UI/UX / themes | **~89%** | Platform shortcut badges; Warm Sand + Spectrum |

**Overall product-scale readiness: ~95%** — Phase 0 exam prep bundle shipped. Next: **Sprint E**
(Dashboard smart CTAs, coverage→tool linkage), then **Sprint G** (FSRS-4 + image occlusion).

---

## Phase 0 — exam prep bundle — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| P1 | Syllabus coverage tracker + landing FAQ |
| P2 | Exam calendar feed + Take a breath wellness |
| P3 | Quiz provenance tags + exercise archetypes (Theme G/D) |
| P4 | Simulator Exam prep sub-tab (patterns, algorithms, GLOSSA) + post-exam next steps |

Key paths: `src/lib/examPrep/`, `src/components/examPrep/`, `ExamPrepPanel.tsx`, `LandingFAQ.tsx`.

---

## Sprint P0–P1 + OCR + C — shipped (Jul 2026)

| Commit | Scope |
| ------ | ----- |
| `e32c0b6` | P0 — empty states, shortcuts, debate/quiz trust, migration UX |
| `ee24088` | E2e — workspace without upload → empty tools |
| `a237ac2` | P1 — Greek reader display repair + OCR review banner |
| `8d0bf7e` | Vision OCR + TrOCR + local ocr-server |
| `38fa960` | Sprint C — Agent selection handoff + full empty-state audit |
| `20b4ff1` | P1 closure — visual snapshot + concept-map empty fix |

---

## Sprint B + D — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| Sprint B | Word-level OCR overlay (`readerOcrOverlay.ts`, `reader-ocr-word-*` testids); real PDF upload e2e (`greek-pdf-upload.spec.ts`, `greek-syllabus-min.pdf`) |
| Sprint D | i18n UploadModal + RecognitionReportPanel (24 keys); table reader e2e; `teacher-dashboard.spec.ts`; `mobile-workspace-drawer.spec.ts` |

---

## Sprint 5–9 — shipped (synaptic_new)

| Sprint | Commit(s) | Scope |
| ------ | --------- | ----- |
| S5 | `42c5450` | Behavior inference, Research tab, agent learning events |
| S6 | `3c5eddb` | Yjs Postgres, teacher assignments, calendar 2-way |
| S7 | `2ecdbf3` | i18n Wave C (Settings/Tasks), PWA offline shell |
| S8 | `65197ac` | DocumentModel v2, recognition worker, upload wire, Library report |
| S9 | `171475b`…`daf5acd` | Adaptive scheduler, quality gates, grounding module, quiz focus, Leitner types, whiteboard SVG — see [`PRODUCT_SCALE_STATUS.md`](PRODUCT_SCALE_STATUS.md) |

---

## Wave A — shipped (`b535971`, Jun 2026)

| Deliverable | Key files |
| ----------- | --------- |
| Spectrum theme applies globally (Warm Sand scoping fix) | `theme.ts`, `index.css` |
| Theme cycle dark / light / spectrum | ThemeToggle.tsx |
| Design-system CTAs | PrimaryCTA.tsx, SecondaryCTA.tsx |
| Post-upload banner on Dashboard + Library | PostUploadBanner.tsx |
| Dashboard greeting i18n | Dashboard.tsx, i18n.ts |
| WCAG contrast tweaks (light + spectrum) | index.css |

---

## Wave B — shipped (`220c7e9`, `63c7b0e`, Jun 2026)

| Deliverable | Key files |
| ----------- | --------- |
| i18n: command palette, study room, reprocess wizard, Feynman outline | i18n.ts, useStudyWorkspace.ts, StudyRoomPanel.tsx, ReprocessPreviewModal.tsx, `feynmanOutline.ts` |
| i18n: compare, argument map, reader toolbar, Feynman rubric, analytics aria | ComparePanel.tsx, ArgumentMap.tsx, CognitiveReader.tsx, FeynmanCheck.tsx |
| Concept map: add/rename/delete node, connect edges | DraggableConceptMap.tsx |
| Concept map: delete edge, cycle relation, undo stack (30 snapshots) | DraggableConceptMap.tsx |
| Concept map graph persistence (scoped per task) | conceptMapGraph.ts, workspacePersistence.ts |
| Reader: explicit Define + Find in text in glossary popover | CognitiveReader.tsx |

---

## Reader / pipeline v2.4.0+ — complete (June 2026)

| Capability | Module | Status |
| ---------- | ------ | ------ |
| Column-major multi-column PDF reading order | pdfExtract.ts | done |
| Layered text repair pipeline v2.5.x | documentTextPipeline.ts | done |
| Greek OCR repair + Varian fixtures | greekTextRepair.ts, `varianCh31Fixtures.ts` | done |
| Reader TTS read aloud + scroll-follow | `readerTts.ts`, CognitiveReader.tsx | done |
| Reader OCR line correction (local) | `readerOcrCorrectionStore.ts`, OcrCorrectionPanel.tsx | MVP |
| Agent auto-send + workspace RAG context | `agentWorkspaceContext.ts`, Agent.tsx | done |
| Mobile intelligence tabs | WorkspaceMobileIntelligenceTabs.tsx | done |

Re-upload / reprocess: courses analyzed before v2.4.0 keep stored extractedText. Use re-upload for full Reader layout, or reprocess when pipelineVersion < 2.4.0.

---

## Wave 8B — recognition depth

| Slice | Scope | Status |
| ----- | ----- | ------ |
| Main path | Multi-column PDF, table/math blocks, scanned PDF OCR | ~80-100% shipped |
| 8B-beta | Layered text repair v2.5.x, hygiene scoring, Varian fixes | shipped |
| 8B-alpha | Math OCR zones | **shipped** — `pdfMathZones.ts`, `/v1/ocr/math`, PDF ingest repair |
| 8B-gamma | Layout-aware DocumentModel | **shipped** — `pdfLayoutBlocks.ts` geometry blocks → DocumentModel |

---

## Remaining gaps (priority order)

| Area | Open work |
| ---- | --------- |
| **Sprint E** | Dashboard smart CTAs from scheduler; coverage→quiz/Leitner deep links; exam prep e2e in CI |
| **Sprint G** | Full FSRS-4; image occlusion cards (Vision bbox → Leitner) |
| i18n | UploadModal source mode / focus tags / processing steps; residual lib/helpers |
| OCR | Browser Tesseract client → stored word regions |

---

## Built gates

- `npm run typecheck` — 0 errors
- `npm test` — Vitest unit tests
- `npm run eval` — recognition gold-set regression (`baseline.json`)
- `npm run doc-lint` — links + D9 guard + capability assertions
- `npm run test:e2e` — Playwright specs in CI
- `npm run test:a11y` — axe gate in CI

---

## Doc maintenance

Update ARCHITECTURE.md, STUDY_WORKSPACE.md, WORKSPACE_TOOLS_UPGRADE.md, I18N.md, CHANGELOG.md, **PRODUCT_SCALE_STATUS.md**, and this file when behavior changes.

See also: I18N.md, STUDY_WORKSPACE.md, EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md.
