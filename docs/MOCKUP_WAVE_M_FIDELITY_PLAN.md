# Wave M — Density closeout + theme SoT + refined icon parity

**Date:** 2026-07-16
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only
**Inputs:** Wave L tip · 11 Replit canvas screenshots · user constraints repeated in the latest turn
**Non-negotiables:** 100% tool functionality · **no oversized type** · **no emoji / unicode chrome glyphs** · Phosphor / refined icons · warm-light + dark first-class · upgrade spectrum/blueprint without wiping identity · no secrets / PII · merge production + canvas

**Companions:** [`MOCKUP_WAVE_L_FIDELITY_PLAN.md`](./MOCKUP_WAVE_L_FIDELITY_PLAN.md), [`MOCKUP_WAVE_K_FIDELITY_PLAN.md`](./MOCKUP_WAVE_K_FIDELITY_PLAN.md), [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md)

---

## 1. Method

| Step | Action |
| ---- | ------ |
| 1 | Sweep the codebase for surviving `text-2xl` / `text-3xl` chrome (setup, results, mock exam, org views, grounded lesson, reprocess modal). |
| 2 | Sweep for surviving unicode chrome glyphs (`✓`, `✗`) — swap for Phosphor `Check` / `X`. |
| 3 | Introduce one shared **kpi-value** utility so canvas KPI numerals cannot regrow. |
| 4 | Refine theme tokens — refine warm-light selected surfaces, add dark KPI/hairline aliases, add `--color-surface-canvas` alias to eliminate implicit `viz-canvas-bg` usage. |
| 5 | Typecheck + secret scan; push only `synaptic_new` `feat/mockup-implementation`. |

---

## 2. Already shipped (do not redo)

Wave A–L: hero IA, hub chips, Create Plan secondary, shell utilities, retention markers, warm-ink light/dark, sepia heatmap only under light, spectrum kept lavender, calibration bins, flow banner, library banner order, Tasks tab filter, Settings theme icons, dashboard density, CourseView density, retrieval strength bar, FSRS expand chrome, Visual Lab sticky footer, embedded Agent density.

---

## 3. Must not remove

- Workspace tools (Reader, Simulator, Quiz, Flashcards, Formula, Concept Map, Timer, Visual Lab)
- Agent (full + embedded), MCP, Research analytics
- Post-upload banner, RAG index banner, NotebookLM import, cross-library synthesis
- Sankey / waterfall / treemap / timeline (flow disclosure body)
- Onboarding steps, Student org + Teacher dashboard flows, ExamPrepView all three phases, Grounded lesson generator, Reprocess preview modal
- Existing spectrum lavender + blueprint glass identities

---

## 4. Sprint M-1 gaps → fixes

| ID | Surface | Gap | Fix |
| -- | ------- | --- | --- |
| **M-D01** | Onboarding welcome | `h1 text-2xl` still Replit-magnified | `text-xl font-semibold ws-serif` |
| **M-D02** | StudentOrgView / TeacherDashboard | `h1 text-2xl` too tall for canvas density | `text-lg font-semibold` |
| **M-D03** | ExamPrepView setup title | `h2 text-2xl` inflates mock-exam header | `text-xl font-semibold` |
| **M-D04** | ExamPrepView results score | `text-3xl` numeral | `text-2xl` (kept larger — still the result headline) |
| **M-D05** | GroundedLessonContent quiz / generated / lesson h2 | `text-2xl font-bold` (three sites) | `text-lg font-semibold` |
| **M-D06** | ReprocessPreviewModal before/after scores | `text-2xl font-bold` | `text-xl font-semibold tabular-nums` |
| **M-I01** | GroundedLessonContent quiz feedback | Literal `✓` / `✗` unicode | Phosphor `Check` / `X` |
| **M-T01** | Theme tokens | No `--color-surface-canvas` alias for page cream/dark; ad-hoc `viz-canvas-bg` reuse | Introduce `--color-surface-canvas` alongside `--viz-canvas-bg` (all 5 themes) |
| **M-T02** | Warm-light selected surfaces | Missing hairline `--color-hairline` alias | Add `--color-hairline` (warm-light + dark + spectrum + blueprint) |
| **M-C01** | Shared KPI utility | KPI numerals differ per surface (regression risk) | `.ux-kpi-value` = `text-xl font-semibold tabular-nums` |

### Density contract (reinforced)

- H1 / hero: `text-xl` (was `text-2xl`)
- H2 section: `text-lg` (was `text-2xl` in grounded/results)
- KPI numeral: `text-xl` via `.ux-kpi-value`
- Result / celebration numeral: `text-2xl` (only ExamPrep results)
- Countdown / mono formula: `text-2xl font-mono` (kept — legibility)

### Theme matrix (unchanged behaviour — new aliases only)

| Theme | Cream scope | `--color-surface-canvas` | `--color-hairline` | Ink |
| ----- | ----------- | ------------------------ | ------------------ | --- |
| light | warm-sand nest | `#fdfbf7` | `#e0d8cc` | `#5c4033` |
| warm-sand | (self) | `#f6f1ea` | `#e0d8cc` | `#5c4033` |
| dark | none | `#0a0a0c` | `#2a2a34` | `#8a6f55` |
| spectrum | none | `#f1eef9` (kept lavender) | `#dcd6ee` | spectrum ink |
| blueprint | none | `#0d1220` | `#1c2a44` | `#8a6f55` |

---

## 5. Sprint M-2

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| M-D07 | Migrate KPI callsites to `.ux-kpi-value` / `.ux-kpi-value-sm` (Dashboard KPI grid + FSRS horizon, Analytics MetricCard + FSRS summary, CourseView library + mastery + velocity, ExamPrep setup + results tiles) | P2 | **shipped** |
| M-A05 | Analytics Visual Lab collapse animation refinement (`AnimatePresence` height+fade, chevron `duration-300 ease-out`, brand tint on open) | P3 | **shipped** |
| M-T03 | Spectrum WCAG contrast audit (danger + amber banner titles now mix ≥55 % of `#1a1430` ink → contrast ≥4.5:1 vs `#f7f5ff`) | P3 | **shipped** |
| M-X05 | Agent embedded chrome inline source picker popover (`Layers` badge + course listbox with `Check`, respects `pinnedFileId`) | P3 | **shipped** |

### Acceptance (Wave M-2)

- [x] All targeted KPI callsites use the shared utility classes.
- [x] Visual Lab collapse: height + fade + chevron rotate share the same 280 ms curve; motion-reduce respected.
- [x] Spectrum banner titles pass WCAG AA against the lavender surface.
- [x] Embedded Agent lets users switch source without opening full page; full-page picker unchanged.
- [x] Tools intact; no secrets in commit.

**Shipped:** Wave M Sprint M-2 (2026-07-16) on `feat/mockup-implementation`.

---

## 6. Security

- Never commit `.env`, live keys, Google secrets, JWT secrets, user dumps.
- Only push to **`Animus1991/synaptic_new`** branch **`feat/mockup-implementation`**.

---

## 7. Acceptance (Wave M-1)

- [x] All `text-2xl` / `text-3xl` chrome removed from primary user pages (except intentional TakeBreath countdown + DiagramGenerator formula)
- [x] `✓` / `✗` unicode chrome removed
- [x] `.ux-kpi-value` utility available and referenced in docs
- [x] `--color-surface-canvas` + `--color-hairline` present for all 5 themes
- [x] Tools intact; no secrets in commit

**Shipped:** Wave M Sprint M-1 (2026-07-16) on `feat/mockup-implementation`.
