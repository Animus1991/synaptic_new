# Wave N — State-of-the-art theme system audit

**Date:** 2026-07-16
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only
**Inputs:** Wave M tip · user constraint: warm-light + dark first-class · κρατούμε spectrum lavender + blueprint glass identities · καμία λειτουργία δεν αφαιρείται.
**Non-negotiables:** 100% tool functionality · **no oversized type / emoji** · Phosphor icons only · warm-light + dark first-class · upgrade spectrum/blueprint without wiping identity · no secrets / PII · merge production + canvas.

**Companions:** [`MOCKUP_WAVE_M_FIDELITY_PLAN.md`](./MOCKUP_WAVE_M_FIDELITY_PLAN.md), [`MOCKUP_WAVE_L_FIDELITY_PLAN.md`](./MOCKUP_WAVE_L_FIDELITY_PLAN.md), [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md).

---

## 1. Method

| Step | Action |
| ---- | ------ |
| 1 | Audit existing theme tokens (focus ring, selection, scrollbar, elevation, pressed state, on-accent contrast). |
| 2 | Add missing SoT tokens **only** — never override existing identity colours. |
| 3 | Ship a shared focus-ring utility `.ux-focus-ring` for pop-ups + custom controls. |
| 4 | Refine warm-sand explicit tokens (no more implicit inheritance from light) + explicit tokens for spectrum + blueprint. |
| 5 | Typecheck + secret scan; push only `synaptic_new` `feat/mockup-implementation`. |

---

## 2. Already shipped (do not redo)

Wave A–M: hero IA, hub chips, Create Plan secondary, shell utilities, retention markers, warm-ink light/dark, sepia heatmap under light, spectrum kept lavender, calibration bins, flow banner, library banner order, Tasks tab filter, Settings theme icons, dashboard/CourseView density, retrieval bar, FSRS expand chrome, Visual Lab sticky footer + collapse polish, embedded Agent chrome + inline source picker, density closeout on Onboarding/Student/Teacher/ExamPrep/Grounded/Reprocess, unicode `✓`/`✗` → Phosphor, `--color-surface-canvas` + `--color-hairline` aliases, `.ux-kpi-value` + `.ux-kpi-value-sm` + `.ux-kpi-label` utilities, spectrum WCAG banner titles.

---

## 3. Must not remove

- All existing focus rings (`:focus-visible` universal + light + spectrum + blueprint overrides).
- Warm-light Warm Sand cream identity (`#fdfbf7 / #f6f1ea / #ffffff` surfaces + sepia heatmap).
- Dark editorial contrast (near-black surfaces + warm ink chips).
- Spectrum vibrant identity (lavender canvas, gradient text, cyan glass).
- Blueprint glass dark identity (radial gradients, glass scrollbar, cyan selection).
- Sankey / waterfall / treemap / timeline / retention curve.
- Existing scrollbar polish (blueprint) + `.hide-scrollbar` + `.scrollbar-none` + `.themed-scrollbar` semantics.

---

## 4. Sprint N-1 (SoT theme system)

| ID | Surface | Gap | Fix |
| -- | ------- | --- | --- |
| **N-T01** | Warm-sand focus ring | Inherits `--focus-ring-color` from `:root` (brand-400 → invisible over cream) | Explicit `--focus-ring-color: var(--color-brand-600)` |
| **N-T02** | Dark focus ring fallback | Uses brand-400 (`#60a5fa`) — passes 3:1 but not the ideal for editorial dark | Explicit `--focus-ring-color: var(--color-brand-500)` (`#3b82f6`) via `[data-theme="dark"]` |
| **N-T03** | On-accent text tokens | Chip / banner titles hardcode `#1a1430` (spectrum) or brand-400 mix; no shared token | Add `--color-on-brand / -danger / -warn / -success / -info` per theme |
| **N-T04** | Pressed / active state | `--color-surface-active` exists but no `--color-surface-pressed` token for buttons | Introduce `--color-surface-pressed` alias (defaults to `--color-surface-active`) |
| **N-T05** | Popover elevation | Embedded source picker + agent mode dropdown use raw `shadow-lg` | Add `--elev-popover` per theme |
| **N-T06** | Themed scrollbar for light + spectrum | Only blueprint has bespoke scrollbar | Add lightweight scrollbar for light + warm-sand + spectrum (unchanged Blueprint override) |
| **N-T07** | `.ux-focus-ring` utility | Custom listboxes (embedded source picker menu items) don't advertise focus | Class that opts an element into the theme's focus token |
| **N-T08** | Warm-light selection | Uses global `::selection { brand-600 → sepia-brown }` — legible but not identity-tuned | Explicit `[data-theme="light"] ::selection` sepia mix |

### Focus-ring per theme (canonical)

| Theme | `--focus-ring-color` | Offset | Rationale |
| ----- | -------------------- | ------ | --------- |
| dark | `var(--color-brand-500)` (`#3b82f6`) | `2px` | Higher-contrast blue over near-black |
| light | `var(--color-brand-700)` (`#533615`) | `2px` | Deep warm ink over cream |
| warm-sand | `var(--color-brand-600)` (`#7d6245`) | `2px` | Slightly softer over Warm Sand |
| spectrum | `var(--color-brand-600)` (`#6b4ff0`) | `2px` | Vibrant lavender |
| blueprint | `#67e8f9` | `2px` | Cyan glass accent |

### On-accent contrast tokens (WCAG AA on colored backgrounds)

| Theme | on-brand | on-danger | on-warn | on-success | on-info |
| ----- | -------- | --------- | ------- | ---------- | ------- |
| dark | `#f4f4f6` (primary) | `#0a0a0c` (near-black) | `#0a0a0c` | `#0a0a0c` | `#f4f4f6` |
| light | `#ffffff` | `#ffffff` | `#3a2f24` (deep ink) | `#ffffff` | `#ffffff` |
| warm-sand | `#ffffff` | `#ffffff` | `#3a2f24` | `#ffffff` | `#ffffff` |
| spectrum | `#ffffff` | `#ffffff` | `#1a1430` (deep ink) | `#1a1430` | `#ffffff` |
| blueprint | `#020617` | `#020617` | `#020617` | `#020617` | `#020617` |

---

## 5. Sprint N-2 (tracked, no omission)

| ID | Item | Priority |
| -- | ---- | -------- |
| N-T09 | Migrate remaining chip / banner titles to `--color-on-*` tokens (audit `.ux-chip-*`) | P2 |
| N-T10 | Migrate popover callsites (embedded source menu, agent mode menu, source settings menu) to `--elev-popover` + `.ux-focus-ring` on items | P2 |
| N-T11 | Add `--color-surface-hover-strong` for two-step hovers (buttons on cards) | P3 |
| N-T12 | Introduce `--motion-ease-emphasized` + apply to Visual Lab collapse + Agent mode dropdown | P3 |

---

## 6. Security

- Never commit `.env`, live keys, Google secrets, JWT secrets, user dumps.
- Push: **`Animus1991/synaptic_new`** · **`feat/mockup-implementation`** only.

---

## 7. Acceptance (Wave N-1)

- [x] `--color-focus-ring` explicit for **all 5 themes** (dark + warm-sand added) with legacy `--focus-ring-color` fallback preserved.
- [x] `--color-on-brand / -danger / -warn / -success / -info` present in **all 5 themes**.
- [x] `--elev-popover` present in **all 5 themes**.
- [x] `--color-surface-pressed` alias present in **all 5 themes**.
- [x] `.ux-focus-ring` utility class shipped and applied to embedded source picker + source settings menu items.
- [x] Warm-light + warm-sand + spectrum have thin themed scrollbars.
- [x] Warm-light + warm-sand `::selection` sepia-tinted, keeping WCAG contrast.
- [x] Agent source settings menu now uses Phosphor `X` (no unicode `✕`) + `--elev-popover`.
- [x] Tools intact; no secrets in commit.

**Shipped:** Wave N Sprint N-1 (2026-07-16) on `feat/mockup-implementation`.
