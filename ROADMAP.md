# Roadmap & Gap Analysis

**Status baseline:** July 2026 — post Sprint 9 (grounding, quality gates, workspace polish).
**Canonical snapshot:** [`PRODUCT_SCALE_STATUS.md`](PRODUCT_SCALE_STATUS.md)

This document separates **done**, **partial**, and **missing** against the product goal: *note-grounded adaptive learning at product scale, not MVP/demo-first.*

---

## Executive summary

| Layer | Completion | Notes |
| ----- | ---------- | ----- |
| Content engine (offline v2) | **~93%** | DocumentModel v2 substrate wired on upload (S8) |
| Upload to course pipeline | **~93%** | Stage 1–2 quality gates (S9); parallel recognition workers |
| Study Workspace (11 tools) | **~94%** | Leitner card types + deck sync; whiteboard agent explain diagram |
| Lesson surfaces | **~82%** | Step-grounded excerpts; concept lens; faithfulness gate |
| Tasks & pedagogy | **~83%** | Unified adaptive scheduler (S9-PR1); FSRS + mastery |
| Analytics & Dashboard | **~78%** | Behavior inference + Research tab (S5) |
| RAG / Agent | **~87%** | Unified grounding module; BM25 + hybrid rerank |
| Client persistence | **~86%** | localStorage + IndexedDB; DocumentModel snapshots |
| Auth and full sync | **~82%** | JWT, library + session pull/push; Leitner deck state in `/v1/session` |
| Phase 6 server | **~88%** (dev) | Docker compose, Redis rate limit, pgvector RAG probe, gradebook |
| Documentation | **~92%** | `PRODUCT_SCALE_STATUS.md` + doc-lint capability assertions |
| Tests & CI | **~92%** | Vitest + eval gold-set gate (`npm run eval`) in CI |
| i18n | **~83%** | Wave C Settings/Tasks shipped (S7); component lint allowlist empty |
| UI/UX / themes | **~88%** | Warm Sand + Spectrum global themes, PWA shell (S7) |

**Overall product-scale readiness: ~90%** — Stage 3 quality gates complete; next:
sub-line annotations and production backend (S10).

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

See I18N.md, STUDY_WORKSPACE.md, WORKSPACE_TOOLS_UPGRADE.md, and EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md for detail.

| Area | Open work |
| ---- | --------- |
| i18n | Residual lib/helpers; Recognition report strings |

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
