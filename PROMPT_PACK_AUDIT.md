# Prompt Pack Audit — Synapse Learning (28 Modules)

> **Date:** June 2026 (rev. 2) · **Tests:** 337 Vitest · **Pipeline:** `2.4.0`  
> **Companion docs:** `PRODUCT_UPGRADE_MASTER_PLAN.md`, `FUNCTION_CATALOG.md`, `ROADMAP.md`

Honest product-scale audit mapped to the 28-prompt pack.

**Labels:** Production-ready · MVP-ready · Prototype-ready · Partially implemented · Planned only · Not ready

---

## Executive summary

Synapse is a **client-first EdTech platform** with a deep pedagogy layer (FSRS, concept bus, 13 workspace tools, Bayesian mastery) and a **real document pipeline** (PDF/DOCX/PPTX/OCR/Greek repair v2.3, PDF v2.4 column-major + lecture merge).

It is **not** a production multi-tenant backend. RAG runs client-side (BM25 + optional hybrid rerank via proxy).

### What has real value today

- Upload → outline → course → Study Workspace loop grounded in user notes
- Greek academic syllabus support (ΔΙΑΛΕΞΗ merge, front-matter, bibliography)
- Library delete/reprocess + `ConfirmDialog`
- Workspace learning actions → Agent auto-send with step/course RAG context
- Mobile tool drawer + unified intelligence tabs (all breakpoints)
- OCR line correction overlay (local, non-destructive)
- 337 unit tests, Playwright E2E (2 specs)

### Critical gaps (from screenshot + code audit)

| Gap | Impact |
|-----|--------|
| **Old pipeline text in stored courses** | Garbled Reader/section nav until reprocess/re-upload at ≥2.4 |
| **Source quality 37/100** | Low grounding score — expected for OCR-heavy PPTX; user needs reprocess |
| **Generated lessons not deleted with file** | Orphan tasks/lessons after delete |
| **Monolithic `useStore.ts`** (~1500 LOC) | Maintainability risk |
| **No production backend RAG/pgvector** | Client keys or dev proxy only |
| **Teacher/collaborative** | Skeleton only — must stay out of MVP UI |

---

## Prompt 1 — Global product architecture

### Architecture map

| Layer | Implementation |
|-------|----------------|
| **Shell** | `Shell.tsx` — 7 views, mobile nav, ⌘K |
| **Routing** | `App.tsx` — `AppView` state machine (not React Router) |
| **State** | `store/useStore.ts` — monolithic hook store |
| **Ingestion** | `UploadModal` → `processUpload` → worker/OCR → course |
| **Learning** | Course → Study Workspace / Tasks / Agent |
| **Persistence** | localStorage + IndexedDB + workspace persistence libs |
| **Server** | Optional proxy: auth, OCR bbox, teacher, billing, annotations |

### Main user journeys

1. Upload → outline preview → generate → **CourseView** → Study Workspace  
2. Dashboard weak area → Study Workspace (concept focus)  
3. Task → workspace / agent / review  
4. Library → delete/reprocess → Reader  

### Bottlenecks

- Single store file — high coupling  
- Stale `extractedText` until user reprocesses after pipeline bumps  
- Intelligence rail was stacking 3 headers on desktop → **fixed: unified tabs**  
- Agent still lacks selected-text handoff from Reader  

### Upgrade phases

| Phase | Focus | Status |
|-------|-------|--------|
| **P0** | Study Workspace UX + doc management | 🟢 Mostly done |
| **P1** | Reader↔step sync, section progress | 📋 Next |
| **P2** | Editable notes depth (split/merge sections) | 🟡 OCR correction MVP done |
| **P3** | Teacher access, server RAG | Planned |
| **P4** | Collaborative study | Planned only |

**Readiness:** Architecture **Prototype-ready** (coherent, not microservices).

---

## Prompt 2 — Page structure & IA

| Page | Role | Readiness | Notes |
|------|------|-----------|-------|
| Landing / Onboarding | Entry | MVP-ready | — |
| Dashboard | Home, weak areas | MVP-ready | — |
| Library | Materials hub | MVP-ready | Delete/reprocess ✅ |
| CourseView | Course hub | MVP-ready | — |
| **Study Workspace** | **Central learning** | **Partially → MVP-ready desktop** | Tabs, actions, Agent handoff |
| Tasks | Next actions | MVP-ready | Section ID link partial |
| Agent | AI tutor | Partially implemented | Auto-send ✅; selected text 📋 |
| Analytics | Progress | Prototype-ready | Partial metrics |
| Teacher | Roster | Prototype-ready | No invites |
| Settings | Prefs | MVP-ready | — |

**Deferred:** Collaborative rooms, time-limited access UI — **do not add to nav**.

---

## Prompt 3 — UI/UX hierarchy

| Issue | Status |
|-------|--------|
| Intelligence rail overload | ✅ Unified tabs, one panel at a time |
| Learning actions discoverability | ✅ `WorkspaceLearningActionBar` |
| Typography / long Greek reading | 🟡 Needs spacing pass |
| Destructive dialogs | ✅ `ConfirmDialog` (Library/CourseView) |
| Visual noise in Reader toolbar | 🟡 Many toggles — group later |

**Readiness:** **Partially implemented** → improving.

---

## Prompt 4 — Study Workspace ⭐

| Zone | Status |
|------|--------|
| A Main learning surface | ✅ Lesson + tools |
| B Contextual actions | ✅ 7 actions + Agent auto-send |
| C Concept/source nav | ✅ Context strip, step rail |
| D Intelligence | ✅ Tabbed (Tips / Concepts / Weak spots) |
| E Tools | ✅ Dock desktop + mobile drawer |
| F Agent handoff | ✅ Auto-send + RAG context |

**Remaining debt:** Reader↔step bidirectional sync; section progress persistence; zen polish; reduce duplicate context-strip vs tab controls.

**Readiness:** **MVP-ready** on desktop; **Partially implemented** on mobile (usable, not polished).

---

## Prompt 5 — Reader

| Feature | Status |
|---------|--------|
| Section nav (ΔΙΑΛΕΞΗ) | ✅ |
| Front-matter / bibliography | ✅ |
| Tables / math | 🟡 Partial |
| Greek repair display | ✅ v2.3+ reprocess |
| OCR overlay + line correction | ✅ MVP |
| Section actions from Reader | 📋 |

**Screenshot note:** Garbled Greek (`ΑΛΛΟΔΑΠΗΣ`, `+10+QK+20`) = **stale extraction**. User action: **Επανεπεξεργασία κειμένου** or re-upload.

**Readiness:** **MVP-ready** for structured syllabi; **Partially implemented** for scans.

---

## Prompts 6–8 — Library / Tasks / Agent

| Module | Readiness | Key gaps |
|--------|-----------|----------|
| Library | MVP-ready | Replace file flow; failed-state UX |
| Tasks | MVP-ready | Task ↔ section ID |
| Agent | Partially implemented | Selected text; follow-up action chips |

---

## Prompts 9–12 — Upload / OCR / PDF / Images

| Area | Status |
|------|--------|
| Upload flow | MVP-ready |
| Greek OCR repair | v2.3 ✅ |
| PDF multi-column | v2.4 column-major ✅ |
| Lecture merge | v2.4 threshold ✅ |
| Image OCR | 🟡 Client Tesseract + optional server |
| OCR confidence UI | ✅ Overlay + correction panel |

**Readiness:** Ingestion **MVP-ready**; OCR **Partially implemented**.

---

## Prompts 13–15 — Notes / Delete / Editable

| Area | Status |
|------|--------|
| Delete/reprocess | MVP-ready |
| OCR line correction | MVP-ready (local overlay) |
| Section rename/split/merge | Planned only |
| Version history | Planned only |

---

## Prompts 16–18 — Teacher / Access / Collaborative

**Planned only** — architecture documented in `PRODUCT_UPGRADE_MASTER_PLAN.md`. Teacher dashboard W4.1 is prototype skeleton only.

---

## Prompts 19–23 — Components / State / States / A11y / Responsive

| Area | Status |
|------|--------|
| `ConfirmDialog` | ✅ |
| `WorkspaceEmptyState` | ✅ |
| Intelligence tabs all breakpoints | ✅ |
| Mobile tool drawer | ✅ |
| State duplication (focus + conceptBus) | 🟡 |
| a11y icon labels | 🟡 Partial |
| i18n | ~35% (shell EL; tools mixed) |

---

## Prompt 24 — Testing

- **337 tests / 92 files** — all passing  
- Greek fixtures: `greekOcrFixtures.ts`, `readerGreekSyllabus.test.ts`  
- Gaps: Workspace component tests, delete UI e2e, OCR correction e2e  

**Readiness:** Lib layer **MVP-ready**; UI **Partially implemented**.

---

## Prompt 25–26 — Docs / Backend

- `README.md`, `ROADMAP.md` synced to v2.4 (June 2026)  
- Server: auth, billing webhooks, OCR route — **Prototype-ready**, not production  

---

## Prompt 27 — Honest readiness table

| Area | Readiness |
|------|-----------|
| UI/UX overall | Partially implemented |
| Study Workspace | MVP-ready (desktop) / Partial (mobile) |
| Reader | MVP-ready (needs reprocess for old uploads) |
| Document ingestion | MVP-ready |
| Library | MVP-ready |
| Tasks | MVP-ready |
| Agent | Partially implemented |
| RAG/source grounding | MVP-ready (client) |
| Delete/reprocess | MVP-ready |
| Editable notes | Partially implemented (OCR correction MVP) |
| Teacher mode | Prototype-ready |
| Collaborative | Planned only |
| Backend production | Not ready |
| Tests | MVP-ready |
| Docs | MVP-ready |

### Critical blockers before paid users

1. Reprocess messaging when source quality < 50  
2. Delete cascades to generated lessons/tasks  
3. Production backend + key vault  
4. Full i18n for workspace tools  

---

## Prompt 28 — Integrated journey

| Step | Works? |
|------|--------|
| Upload → Library | ✅ |
| Open Reader (structured) | ✅ (if pipeline current) |
| Study Workspace + learning actions | ✅ |
| Explain from zero → Agent auto-reply | ✅ |
| Delete / reprocess file | ✅ |
| OCR correction in Reader | ✅ |
| Greek v2.4 on reprocess | ✅ |
| Old course without reprocess | ⚠️ Garbled text expected |

---

## Next recommended steps (strict order)

1. ~~**Reader↔step bidirectional sync** (SW-P1-04)~~ ✅ `readerStepSyncBridge`, `readerStepSyncP104QA` (`552d0ef`)
2. ~~**SW-P1-03 full action row**~~ ✅ `lessonStepUnifiedActions` on `LessonStepToolBar`
3. **Reprocess banner** when `sourceQuality < 50` or `pipelineVersion < 2.4`
4. **Delete cascade** — remove generated tasks/lessons with file
5. **Reader section actions** — Study / Ask Agent from section nav
6. **Agent selected-text handoff** from Reader selection
7. **UI hierarchy pass** — remaining Greek spacing polish (Noto Greek ✅ shipped)

---

*Implement one `FUNCTION_CATALOG.md` row at a time. Do not expand teacher/collaborative UI until P0–P2 are stable.*
