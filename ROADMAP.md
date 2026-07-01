# Roadmap & Gap Analysis

**Status baseline:** July 2026 — post Sprint 8 (DocumentModel substrate), S7 PWA,
S6 teacher assignments, S5 behavior inference.

This document separates **done**, **partial**, and **missing** against the product goal: *note-grounded adaptive learning at product scale, not MVP/demo-first.*

---

## Executive summary

| Layer | Completion | Notes |
| ----- | ---------- | ----- |
| Content engine (offline v2) | **~92%** | DocumentModel v2 substrate wired on upload (S8) |
| Upload to course pipeline | **~92%** | Parallel DocumentModel + course recognition workers |
| Study Workspace (11 tools) | **~91%** | Note-grounded, mobile drawer, Agent handoff |
| Lesson surfaces | **~80%** | LessonView + PracticalLessonView note/LLM-grounded |
| Tasks & pedagogy | **~80%** | Generated tasks, FSRS to store, Beta-Bernoulli mastery |
| Analytics & Dashboard | **~78%** | Behavior inference + Research tab (S5) |
| RAG / Agent | **~85%** | BM25 + hybrid embedding rerank; workspace context on handoff |
| Client persistence | **~85%** | localStorage + IndexedDB; DocumentModel snapshots on files |
| Auth and full sync | **~80%** | JWT, library + session pull/push |
| Phase 6 server | **~75%** (dev) | Express proxy + auth + sync + OCR/RAG; not production-hardened |
| Documentation | **~90%** | S8 truth pass + doc-lint capability assertions |
| Tests & CI | **~91%** | Vitest + eval gold-set gate (`npm run eval`) in CI |
| i18n | **~82%** | Wave C Settings/Tasks shipped (S7); component lint allowlist empty |
| UI/UX / themes | **~88%** | Warm Sand + Spectrum global themes, PWA shell (S7) |

**Overall product-scale readiness: ~88%** — DocumentModel substrate unblocks quality
gates, grounding eval expansion, and teacher cohort insights (S9–S10).

---

## Sprint 5–8 — shipped (synaptic_new)

| Sprint | Commit | Scope |
| ------ | ------ | ----- |
| S5 | `42c5450` | Behavior inference, Research tab, agent learning events |
| S6 | `3c5eddb` | Yjs Postgres, teacher assignments, calendar 2-way |
| S7 | `2ecdbf3` | i18n Wave C (Settings/Tasks), PWA offline shell |
| S8 | `65197ac` | DocumentModel v2, recognition worker, upload wire, Library report |

---

## Wave A — shipped (535971, Jun 2026)

| Deliverable | Key files |
| ----------- | --------- |
| Spectrum theme applies globally (Warm Sand scoping fix) | 	heme.ts, index.css |
| Theme cycle dark / light / spectrum | ThemeToggle.tsx |
| Design-system CTAs | PrimaryCTA.tsx, SecondaryCTA.tsx |
| Post-upload banner on Dashboard + Library | PostUploadBanner.tsx |
| Dashboard greeting i18n | Dashboard.tsx, i18n.ts |
| WCAG contrast tweaks (light + spectrum) | index.css |

---

## Wave B — shipped (220c7e9, 63c7b0e, Jun 2026)

| Deliverable | Key files |
| ----------- | --------- |
| i18n: command palette, study room, reprocess wizard, Feynman outline | i18n.ts, useStudyWorkspace.ts, StudyRoomPanel.tsx, ReprocessPreviewModal.tsx, eynmanOutline.ts |
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
| Greek OCR repair + Varian fixtures | greekTextRepair.ts, arianCh31Fixtures.ts | done |
| Reader TTS read aloud + scroll-follow | 
eaderTts.ts, CognitiveReader.tsx | done |
| Reader OCR line correction (local) | 
eaderOcrCorrectionStore.ts, OcrCorrectionPanel.tsx | MVP |
| Agent auto-send + workspace RAG context | gentWorkspaceContext.ts, Agent.tsx | done |
| Mobile intelligence tabs | WorkspaceMobileIntelligenceTabs.tsx | done |

Re-upload / reprocess: courses analyzed before v2.4.0 keep stored extractedText. Use re-upload for full Reader layout, or reprocess when pipelineVersion < 2.4.0.

---

## Wave 8B — recognition depth

| Slice | Scope | Status |
| ----- | ----- | ------ |
| Main path | Multi-column PDF, table/math blocks, scanned PDF OCR | ~80-100% shipped |
| 8B-beta | Layered text repair v2.5.x, hygiene scoring, Varian fixes | shipped |
| 8B-alpha | Math OCR zones | not started |
| 8B-gamma | Layout-aware DocumentModel | **partial** — v2 blocks/relations + upload wire (S8); PDF layout blocks future |

---

## Remaining gaps (priority order)

See I18N.md, STUDY_WORKSPACE.md, WORKSPACE_TOOLS_UPGRADE.md, and EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md for detail.

| Area | Open work |
| ---- | --------- |
| Pedagogy | Unified adaptive scheduler (FSRS × mastery × exam pacing) — S9 |
| i18n | Residual lib/helpers; new S8 strings in RecognitionReportPanel |
| Backend | pgvector default path, Redis/BullMQ production, teacher gradebook — S10 |
| Algorithms | Math OCR, layout-aware PDF blocks, grounding eval expansion |
| Tools | Whiteboard pro, sub-line annotations, Leitner card types — S9 |

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

Update ARCHITECTURE.md, STUDY_WORKSPACE.md, WORKSPACE_TOOLS_UPGRADE.md, I18N.md, CHANGELOG.md, and this file when behavior changes.

See also: I18N.md, STUDY_WORKSPACE.md, EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md.
