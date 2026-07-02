# Product-scale status (canonical snapshot)

**Last reconciled:** 2026-07-02 — aligned with `synaptic_new/main` through the latest mainline sync.

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

**~92% product-scale** — S9 grounding consolidation and **Stage 3 quality gates**
shipped. Remaining gaps: i18n residual strings.

---

## Layer completion

| Layer | % | Shipped truth (Jul 2026) |
| ----- | - | ------------------------ |
| Content engine (offline v2) | **~95%** | DocumentModel v2 + PDF layout blocks (8B-gamma) |
| Upload → course pipeline | **~94%** | Stage 3 quality gates — span 95%, source text 90% |
| Study Workspace (11 tools) | **~94%** | Note-grounded tools; Leitner card types + deck sync; whiteboard agent explain |
| Lesson surfaces | **~82%** | Step-grounded excerpts; concept lens chrome; grounding faithfulness gate |
| Tasks & pedagogy | **~83%** | Unified adaptive scheduler (S9-PR1); FSRS + Beta-Bernoulli mastery |
| Analytics & Dashboard | **~78%** | Behavior inference + Research tab (S5) |
| RAG / Agent | **~88%** | Unified grounding; Stage 3 faithfulness 0.95 eval gate |
| Client persistence | **~86%** | localStorage + IndexedDB; DocumentModel snapshots |
| Auth & sync | **~80%** | JWT, library + session pull/push |
| Phase 6 server (dev) | **~92%** | Docker compose, Redis rate limit, pgvector probe, gradebook + class Postgres |
| Documentation | **~92%** | This reconciliation pass + doc-lint capability assertions |
| Tests & CI | **~93%** | Vitest + `npm run eval` gold-set gate (Stage 3: 30/30) |
| i18n | **~83%** | Wave C Settings/Tasks (S7); component lint allowlist empty |
| UI/UX / themes | **~88%** | Warm Sand + Spectrum; PWA shell (S7) |

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
| Quiz | Grounded feedback → focus bus; remediate wrong → Leitner card | — |
| Annotations | **Sub-line span highlights** (`charStart`/`charEnd`); line-level legacy | — |
| Grounding | Unified module; **Stage 3** eval gates (span 95%, faithfulness 0.95) | — |
| Reader | TTS, OCR correction MVP, step sync, **math OCR zones (8B-alpha)** | per-word OCR bboxes |

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

1. **i18n residual** — Recognition report strings

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
