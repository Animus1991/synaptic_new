# Product-scale status (canonical snapshot)

**Last reconciled:** 2026-07-04 — aligned with `synaptic_new/main` through **Sprint E** (dashboard smart CTAs + coverage deep links, Jul 2026).

This file is the **single shipped-truth status doc**. Use it for readiness reviews,
sprint close-outs, and investor/contributor snapshots.

| Doc | Role |
| --- | ---- |
| **`PRODUCT_SCALE_STATUS.md`** (this file) | What ships today + open gaps |
| `ROADMAP.md` | Layer completion table + sprint tables |
| `CHANGELOG.md` | Dated shipped history |
| `PRODUCT_SCALE_PLAN.md` | Forward masterplan (workstreams, sequencing) |

---

## Overall readiness

**~96% product-scale** — S9 grounding + Stage 3 gates shipped. **P0 content trust**,
**P1 Greek Reader repair**, **Vision OCR pipeline**, **Sprint C empty-state / Agent
handoff**, **Sprint B/D**, **Phase 0 exam prep bundle**, and **Sprint E** (smart CTAs,
coverage→tool deep links, e2e) landed locally (Jul 2026).
Remaining gaps: UploadModal source-mode residual strings, production multi-tenant scale.

---

## Sprint P0–P1 + OCR + C — shipped (`20b4ff1`)

| Commit | Scope |
| ------ | ----- |
| `e32c0b6` | **P0** — upload-gated empty states; quiz `placeholder` (no fake `- - -`); debate `seedTree = null`; platform shortcuts (`Ctrl K` on Windows, breadcrumb `›`); migration affected-items list; dark elevation + WCAG brand text |
| `ee24088` | **E2e** — no-demo onboarding → 8 tools show `workspace-empty-state[data-has-source="false"]` |
| `a237ac2` | **P1 slice 1** — `readerGreekDisplay.ts` stale v2.2.0 repair; `prepareWorkspaceDisplayText` + glossary in Reader; `reader-greek-ocr-banner` |
| `8d0bf7e` | **Vision OCR** — `transcribeImageWithVision`, TrOCR handwriting (`handwritingOcr.ts`), bilingual ensemble vision path, `useVisionOcr` setting, local `ocr-server/` (Tesseract + optional vision-LLM) |
| `38fa960` | **Sprint C + P1 e2e** — `selectionExcerpt` in Agent context JSON; full empty-state audit (11 session models); e2e for 13 dock tools + Agent selection handoff |
| `20b4ff1` | **P1 closure** — concept-map empty when `!hasSource`; Greek reader visual snapshot `reader-greek-v220-body.png`; agent-handoff + greek-syllabus e2e green |

Regression gate (Jul 2026): `npm test`, `npm run eval` (30/30 Stage 3), key e2e specs
including `greek-syllabus-reader.spec.ts`, `workspace-empty-tools.spec.ts`,
`workspace-agent-handoff.spec.ts`.

---

## Phase 0 — exam prep bundle — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **P1 — coverage + FAQ** | `syllabusCoverageTracker.ts` + `SyllabusCoverageWidget.tsx` on Dashboard (topics, %, countdown); `LandingFAQ.tsx` on Landing (6 Q&A) |
| **P2 — calendar + wellness** | `examCalendarFeed.ts` + `ExamCalendarPanel.tsx` (General/Panhellenic filters); Take a breath modal in Shell + StudyTimer pomodoro (`takeBreath.ts`, `TakeBreathModal.tsx`) |
| **P3 — quiz + exercises** | Quiz provenance tags (`quizProvenance.ts`, `WorkspaceQuizSession.tsx`); Theme G/D exercise archetypes (`exerciseArchetypes.ts`) |
| **P4 — Simulator sub-tab** | `ExamPrepPanel.tsx` inside Simulator: methodology patterns, algorithm stepper, GLOSSA sandbox; post-exam next steps on Dashboard |
| **i18n + tests** | ~135 EN/EL keys; 7 unit tests in `src/lib/examPrep/*.test.ts`; e2e `technotes-features.spec.ts` |

Regression gate: `npm test` 926/926; `npm run i18n-lint`; `npm run typecheck`.

**Next:** Sprint G — FSRS-4 + image occlusion cards.

---

## Sprint E — dashboard smart CTAs — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Smart CTA strip** | `dashboardSmartCTAs.ts` + `DashboardSmartCTAStrip.tsx` — scheduler, coverage, review-due actions (max 3) |
| **Coverage deep links** | Per-topic Practice on `SyllabusCoverageWidget`; `recommendToolForTopic` → quiz / Leitner / Simulator exam-prep |
| **Workspace routing** | `openStudyWorkspaceForPractice`; `WorkspaceFocus.preferredTool` + `simulatorTab`; unified scheduler `workspaceTool` on next actions |
| **Tests** | 6 unit tests (`coveragePracticeActions`, `dashboardSmartCTAs`); e2e `sprint-e-dashboard.spec.ts` (3/3) |

Regression gate: `npm test` 932/932; `npm run typecheck`; `npm run i18n-lint`; Sprint E e2e green.

---

## Sprint B + D — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Sprint B — OCR bboxes** | Word-level heuristic + stored-region split in `readerOcrOverlay.ts`; `data-testid="reader-ocr-word-{i}"` + `data-ocr-granularity` in Reader overlay; 5 unit tests |
| **Sprint B — PDF e2e** | `e2e/fixtures/greek-syllabus-min.pdf` + generator; `upload-file-input` testid; `greek-pdf-upload.spec.ts` (file input → outline → workspace → reader) |
| **Sprint D — i18n** | 24 EN/EL keys for UploadModal drop zone/header/errors + RecognitionReportPanel; `npm run i18n-lint` pass |
| **Sprint D — Reader e2e** | `greek-syllabus-reader.spec.ts` table segment / indicator fallback assertion |
| **Sprint D — Teacher MVP e2e** | `teacher-dashboard.spec.ts` offline sign-in smoke |
| **Sprint D — Mobile polish e2e** | `mobile-workspace-drawer.spec.ts` @ 390×844 — bottom nav, drawer, tool switch |

Regression gate: `npm test` 919/919; `npm run i18n-lint`; e2e green for
`greek-pdf-upload`, `teacher-dashboard`, `mobile-workspace-drawer`, `greek-syllabus-reader`.

---

## Layer completion

| Layer | % | Shipped truth (Jul 2026) |
| ----- | - | ------------------------ |
| Content engine (offline v2) | **~95%** | DocumentModel v2 + PDF layout blocks (8B-gamma) |
| Upload → course pipeline | **~94%** | Stage 3 quality gates — span 95%, source text 90% |
| Study Workspace (13 tools) | **~95%** | P0 empty-state contract; selection → Agent handoff; concept-map upload gate |
| Lesson surfaces | **~82%** | Step-grounded excerpts; concept lens chrome; grounding faithfulness gate |
| Tasks & pedagogy | **~83%** | Unified adaptive scheduler (S9-PR1); FSRS + Beta-Bernoulli mastery |
| Analytics & Dashboard | **~80%** | Behavior inference + Research tab (S5); exam calendar + coverage + post-exam panels |
| RAG / Agent | **~90%** | Unified grounding; workspace context JSON + **selection excerpt handoff** |
| Recognition / OCR | **~92%** | Word-level overlay bboxes; Greek repair v2.5.1; Vision LLM + TrOCR; local `ocr-server/` |
| Client persistence | **~86%** | localStorage + IndexedDB; DocumentModel snapshots |
| Auth & sync | **~80%** | JWT, library + session pull/push |
| Phase 6 server (dev) | **~92%** | Docker compose, Redis rate limit, pgvector probe, gradebook + class Postgres |
| Documentation | **~93%** | This reconciliation pass (Jul 2026) |
| Tests & CI | **~95%** | Vitest 926; + exam prep unit tests; `technotes-features.spec.ts` e2e smoke |
| i18n | **~90%** | UploadModal + RecognitionReportPanel keys; exam prep ~135 keys; component lint allowlist empty |
| UI/UX / themes | **~89%** | Warm Sand + Spectrum; platform shortcut badges (P0) |

---

## Sprint 9 — shipped (`synaptic_new/main`)

| Commit | Scope |
| ------ | ----- |
| `171475b` | S9-PR1 — unified adaptive scheduler (dashboard + workspace actions) |
| `5afb18e` | S9-PR2 — course quality gates + workspace pro polish |
| `72854ff` | S9-PR3 — grounding faithfulness gate (lessons + agent) |
| `f1bc86b` | S9-PR4 — concept lens chrome + minimal ribbon |
| `a36037e` | S9-PR4 — QuizPanel grounded feedback → focus bus |
| `d13fad6` | S9-PR5 — grounding modules → `src/lib/grounding/` |
| `a7a862b` | Stage 1 quality gates (`qualityThresholds.ts`) |
| `ec543a3` | Stage 2 quality gates (PASS 75, span 70%, faithfulness 0.75) |
| `2ad7ad5` | Fix lesson ↔ reader step-grounded excerpt matching |
| `956a4b6` | Workspace boot latency — parallel reader/body prefetch |
| `b324969` | Whiteboard SVG export alongside PNG |
| `8134462` | Doc reconciliation — `PRODUCT_SCALE_STATUS.md` + ROADMAP/CHANGELOG sync |
| `daf5acd` | Leitner card types (term/definition/cloze/formula/mistake) |
| `a5e3c4b` | Stage 3 quality gates — span 95%, faithfulness 0.95, eval baseline |
| `0688f68` | Sub-line span annotations (`charStart`/`charEnd`, `annotationSpan.ts`) |

### Sprint 5–8 (prior)

| Sprint | Commit | Scope |
| ------ | ------ | ----- |
| S5 | `42c5450` | Behavior inference, Research tab |
| S6 | `3c5eddb` | Yjs Postgres, teacher assignments, calendar 2-way |
| S7 | `2ecdbf3` | i18n Wave C, PWA offline shell |
| S8 | `65197ac` | DocumentModel v2, recognition worker, upload wire |

---

## Workspace tools — shipped vs open

| Tool | Shipped (recent) | Still open |
| ---- | ---------------- | ---------- |
| Leitner | Card types + filter chips; quiz-mistake → `mistake` type; source badges; **cross-device deck sync via `/v1/session`** | — |
| Whiteboard | PNG + SVG export; **agent explain diagram** (`describeWhiteboardDocument` → `diagram-explain`) | — |
| Reader | TTS, OCR overlay, **word-level OCR bboxes**, **Greek v2.2.0 display repair**, suspicious + **Greek OCR review banners**, section actions, **visual regression baseline**, **real PDF upload e2e** | browser Tesseract word regions; math segment dedicated e2e |
| Quiz | **Placeholder empty state** (no fake options); grounded feedback → focus bus | IRT calibration UI |
| Debate | **Empty when no tree** (no single-node fallback) | Multi-turn grounded debate |
| Concept map | **Upload-gated empty** (`!hasSource` → no fabricated node) | Prerequisite repair from concept bus |
| Agent | BM25 + hybrid rerank; **selection excerpt in context JSON + retrieval query** | Server pgvector scale path |
| Grounding | Unified module; **Stage 3** eval gates (span 95%, faithfulness 0.95) | — |
| Annotations | Sub-line span highlights | Cross-tool highlight sync |
| Simulator | **Exam prep sub-tab** + scheduler-driven CTAs from Dashboard | — |
| Dashboard | **Coverage tracker**, **smart CTA strip**, exam calendar, post-exam next steps | — |

---

## Quality gates (`src/lib/qualityThresholds.ts`)

| Stage | PASS | Span ratio | Faithfulness (eval) | Status |
| ----- | ---- | ---------- | ------------------- | ------ |
| 1 | 68 | 55% | 0.58 (positive-only avg) | ✅ shipped |
| 2 | 75 | 70% | 0.75 | ✅ shipped |
| 3 | 75 | 95% | 0.95 | ✅ shipped |

Eval harness: `npm run eval` — 30/30 at Stage 3 baseline.

---

## Priority gaps (next)

1. **Sprint G — retention science** — full FSRS-4; image occlusion cards (Vision bbox → Leitner)
2. **UploadModal residual i18n** — source mode labels, focus tags, processing steps
3. **Orphan delete cascade** — delete file → tasks/lessons cleanup (PROMPT_PACK_AUDIT)
4. **Production scale** — multi-tenant isolation, OCR GPU queue, billing tiers
5. **Browser OCR word regions** — wire Tesseract client path to stored word boxes

### Shipped recently (no longer open)

- ~~Sprint E smart CTAs~~ → Dashboard CTA strip, coverage Practice deep links, workspace tool routing, e2e (Jul 2026)
- ~~Phase 0 exam prep bundle~~ → coverage tracker, landing FAQ, exam calendar, Take a breath, Simulator Exam prep tab, quiz provenance, post-exam next steps (Jul 2026)
- ~~Per-word OCR bboxes~~ → `readerOcrOverlay.ts` word heuristic + `reader-ocr-word-*` testids (Sprint B)
- ~~Real PDF upload e2e~~ → `greek-pdf-upload.spec.ts` + `greek-syllabus-min.pdf` (Sprint B)
- ~~Recognition report i18n~~ → `RecognitionReportPanel.tsx` + i18n keys (Sprint D)
- ~~UploadModal drop zone i18n~~ → header, drop zone, errors (Sprint D)
- ~~Teacher MVP e2e~~ → `teacher-dashboard.spec.ts` (Sprint D)
- ~~Mobile workspace drawer e2e~~ → `mobile-workspace-drawer.spec.ts` (Sprint D)

- ~~Platform shortcuts mojibake~~ → `commandPaletteBadge()` (P0)
- ~~Fabricated quiz/debate empty content~~ → P0 + `toolEmptyStates.audit.test.ts`
- ~~Reader Greek spaced letters (v2.2.0)~~ → `readerGreekDisplay.ts` + e2e + snapshot
- ~~Vision OCR uncommitted WIP~~ → `8d0bf7e` + `ocr-server/`
- ~~Reader selection → Agent handoff~~ → `selectionExcerpt` (Sprint C)
- ~~Partial empty-state e2e (8 tools)~~ → 13 dock tools (Sprint C)

---

## Built gates

- `npm run typecheck` — 0 errors
- `npm test` / `npx vitest run` — unit tests
- `npm run eval` — recognition + grounding gold-set
- `npm run doc-lint` — links + D9 guard + capability assertions
- `npm run test:e2e` — Playwright in CI
- `npm run test:a11y` — axe gate in CI

---

## Maintenance

When shipping a user-visible feature or changing gates:

1. Add a dated entry to `CHANGELOG.md` `[Unreleased]`.
2. Update this file (commit + gap table).
3. Adjust `ROADMAP.md` layer % and sprint table if material.
4. Run `npm run doc-lint`.
