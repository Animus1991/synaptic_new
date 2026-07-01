# Product-scale status (canonical snapshot)

**Last reconciled:** 2026-07-01 — aligned with `synaptic_new/main` through `daf5acd`.

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

**~89% product-scale** — note-grounded Study Workspace at product depth; S9
grounding consolidation, staged quality gates, and workspace tool polish largely
shipped. Remaining gaps are sub-line annotations, Stage 3 gates, production
backend hardening, and residual i18n.

---

## Layer completion

| Layer | % | Shipped truth (Jul 2026) |
| ----- | - | ------------------------ |
| Content engine (offline v2) | **~93%** | DocumentModel v2 + recognition worker (S8) |
| Upload → course pipeline | **~93%** | Parallel DocumentModel + course recognition; Stage 1–2 quality gates (S9) |
| Study Workspace (11 tools) | **~92%** | Note-grounded tools; Leitner card types; whiteboard PNG+SVG export |
| Lesson surfaces | **~82%** | Step-grounded excerpts; concept lens chrome; grounding faithfulness gate |
| Tasks & pedagogy | **~83%** | Unified adaptive scheduler (S9-PR1); FSRS + Beta-Bernoulli mastery |
| Analytics & Dashboard | **~78%** | Behavior inference + Research tab (S5) |
| RAG / Agent | **~87%** | BM25 + hybrid rerank; unified `src/lib/grounding/`; agent faithfulness gate |
| Client persistence | **~86%** | localStorage + IndexedDB; DocumentModel snapshots |
| Auth & sync | **~80%** | JWT, library + session pull/push |
| Phase 6 server (dev) | **~75%** | Express proxy + OCR/RAG; not production-hardened |
| Documentation | **~92%** | This reconciliation pass + doc-lint capability assertions |
| Tests & CI | **~92%** | Vitest + `npm run eval` gold-set gate (30/30 at Stage 2) |
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
| `daf5acd` | Leitner card types (term/definition/cloze/formula/mistake) |

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
| Leitner | Card types + filter chips; quiz-mistake → `mistake` type; source badges | Server deck sync |
| Whiteboard | PNG + SVG export (`whiteboardExport.ts`) | Agent “explain diagram” |
| Quiz | Grounded feedback → focus bus; remediate wrong → Leitner card | — |
| Annotations | Line-level stored annotations | **Sub-line** span annotations |
| Grounding | Unified module; Stage 1–2 eval gates | **Stage 3** (span 95%, faithfulness 0.95) |
| Reader | TTS, OCR correction MVP, step sync | Math OCR zones (8B-alpha) |

---

## Quality gates (`src/lib/qualityThresholds.ts`)

| Stage | PASS | Span ratio | Faithfulness (eval) | Status |
| ----- | ---- | ---------- | ------------------- | ------ |
| 1 | 68 | 55% | 0.58 (positive-only avg) | ✅ shipped |
| 2 | 75 | 70% | 0.75 | ✅ shipped |
| 3 | TBD | 95% | 0.95 | 🔲 planned |

Eval harness: `npm run eval` — 30/30 at Stage 2 baseline.

---

## Priority gaps (next)

1. **Stage 3 quality gates** — span 95% + faithfulness 0.95
2. **Sub-line annotations** — span-level highlights beyond line storage
3. **Production backend** — Redis/BullMQ, pgvector default, teacher gradebook UI
4. **Math OCR** — layout-aware PDF math zones (8B-alpha)
5. **i18n residual** — new S8/S9 strings (Recognition report, Leitner types done)

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
