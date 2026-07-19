# Wave O — Motion polish + reduced-motion global respect

**Date:** 2026-07-16
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only
**Inputs:** Wave N tip · user constraint: no oversized type, no emoji, warm-light + dark first-class · κρατούμε framer-motion 12 identities · καμία λειτουργία δεν αφαιρείται.
**Non-negotiables:** 100% tool functionality · **no oversized type / emoji** · Phosphor icons only · warm-light + dark first-class · upgrade spectrum/blueprint without wiping identity · no secrets / PII · merge production + canvas.

**Companions:** [`MOCKUP_WAVE_N_FIDELITY_PLAN.md`](./MOCKUP_WAVE_N_FIDELITY_PLAN.md), [`MOCKUP_WAVE_M_FIDELITY_PLAN.md`](./MOCKUP_WAVE_M_FIDELITY_PLAN.md), [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md).

---

## 1. Method

| Step | Action |
| ---- | ------ |
| 1 | Audit all `AnimatePresence` + `motion.*` callsites (24 files) και reduced-motion coverage. |
| 2 | Ship a **global** `MotionConfig reducedMotion="user"` wrapper στο `App` — ώστε ένα OS-level `prefers-reduced-motion: reduce` να σβήνει transitions **σε όλο το app** χωρίς per-callsite refactor. |
| 3 | Migrate the highest-visibility `AnimatePresence` callsites στο **emphasized decelerate curve** (`[0.2, 0, 0, 1] @ 360 ms`) που ορίστηκε στο N-T12. |
| 4 | Preserve spring transitions (ConfirmDialog, DashboardHubShell overlay) — αυτά έχουν intentional physics; απλώς κληρονομούν το `reducedMotion` από το MotionConfig. |
| 5 | Typecheck + secret scan; push only `synaptic_new` `feat/mockup-implementation`. |

---

## 2. Already shipped (do not redo)

Wave A–N: hero IA, hub chips, Create Plan secondary, shell utilities, retention markers, warm-ink light/dark, sepia heatmap under light, spectrum kept lavender, calibration bins, flow banner, library banner order, Tasks tab filter, Settings theme icons, dashboard/CourseView density, retrieval bar, FSRS expand chrome, Visual Lab sticky footer + collapse polish, embedded Agent chrome + inline source picker, density closeout, unicode → Phosphor, `--color-surface-canvas` + `--color-hairline`, `.ux-kpi-value*`, spectrum WCAG banners, SoT theme tokens (`--color-focus-ring`, `--color-surface-pressed`, `--color-on-*`, `--elev-popover`), `.ux-focus-ring`, `.ux-hover-strong`, `.ux-elev-popover`, `.ux-chip-solid-*`, `--motion-duration-emphasized`, `--motion-ease-emphasized`, Analytics Visual Lab + Agent embedded mode dropdown on emphasized curve.

---

## 3. Must not remove

- Global CSS `@media (prefers-reduced-motion: reduce)` block στο `index.css` γραμμή ~5026.
- `useReducedMotion` hook + `MotionSection` + `PlatformViewTransition` που ήδη το σέβονται.
- Spring transitions σε ConfirmDialog (`spring 26/320`) + DashboardHubShell overlay (`spring 28/340`) — intentional physics για modal snap.
- Blueprint bespoke motion (orb pulse, timeline dot pulse, leitner flip, source-flow pipe) — κρατείται πίσω από `@media (prefers-reduced-motion: no-preference)` guard.

---

## 4. Sprint O-1 (motion polish)

| ID | Surface | Gap | Fix |
| -- | ------- | --- | --- |
| **O-M01** | Global reduced-motion for framer-motion | 24 AnimatePresence callsites βασίζονται μόνο στο CSS media query — Framer Motion δεν το σέβεται αυτόματα | `<MotionConfig reducedMotion="user">` wrapper γύρω από το κύριο `Shell` στο `App.tsx` (framer-motion v12+) |
| **O-M02** | Onboarding step transitions | 4 × `motion.div` (welcome/role/goals/schedule) χωρίς `transition` prop — έπαιρναν default spring | Explicit `{ duration: 0.32, ease: [0.2, 0, 0, 1] }` για ταιριαστό pacing με νέο emphasized token |
| **O-M03** | UploadModal panel + backdrop | Χωρίς explicit transition — panel scale/y transition ήταν default spring | Explicit `duration + ease [0.2, 0, 0, 1]` (backdrop 220 ms, panel 360 ms) |
| **O-M04** | AppToastBanner + OfflineShellBanner back-online toast | Bare `initial/animate/exit` χωρίς `transition` | Explicit emphasized 360 ms transition |
| **O-M05** | Wave N callsites already migrated | Analytics Visual Lab collapse (M-A05 → N-T12), Agent embedded mode dropdown (N-T12) | Verified: `[0.2, 0, 0, 1] @ 360 ms` intact |

### Acceptance (Wave O-1)

- [x] `MotionConfig reducedMotion="user"` shipped στο `App.tsx` (import + wrap). Δεν σπάει τη ροή του `AnimatePresence mode="wait"` για routes.
- [x] Onboarding step motion.div: explicit `transition` σε 4 steps.
- [x] UploadModal: explicit transition σε backdrop + panel.
- [x] AppToastBanner + OfflineShellBanner: explicit emphasized transition.
- [x] Analytics Visual Lab + Agent embedded mode dropdown κρατούν το emphasized curve (N-T12) — δεν αγγίχτηκαν.
- [x] Spring transitions (ConfirmDialog, DashboardHubShell overlay) κρατούνται — physics intentional.
- [x] Tools intact; typecheck clean; no secrets in commit.

**Shipped:** Wave O Sprint O-1 (2026-07-16) on `feat/mockup-implementation`.

---

## 5. Sprint O-2 — SHIPPED (2026-07-16, co-shipped with Wave P Sprint P-3)

| ID | Item | Status |
| -- | ---- | ------ |
| **O-M06** | Remaining AnimatePresence → emphasized transition (Tasks expand, Library tabs/expand, LessonView steps, ReprocessPreviewModal backdrop+panel, workspace CommandPalette / MiniDashboard / AnnotationOverlay / FormulaScratchpad) | ✅ |
| **O-M07** | `.ux-motion-fade-in` / `.ux-motion-slide-in` CSS utilities + `prefers-reduced-motion: reduce` kill-switch | ✅ |
| **O-M08** | `whileHover` / `whileTap` audit | ✅ verify — **zero** callsites in `src/`; `MotionConfig reducedMotion="user"` covers all framer-motion. No diff. |
| **O-M09** | `src/lib/motion.ts` — `emphasizedTransition`, `emphasizedBackdropTransition`, `fadeUp`, `slideIn`, `scaleIn`, `expandHeight` | ✅ |

---

## 6. Security

- Never commit `.env`, live keys, Google secrets, JWT secrets, user dumps.
- Push: **`Animus1991/synaptic_new`** · **`feat/mockup-implementation`** only.
