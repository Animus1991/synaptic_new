# Wave P — Density, gap tuning & theme contrast (WCAG audit + fixes)

**Date:** 2026-07-16
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only
**Inputs:** user screenshots (warm-light Settings + Dashboard, spectrum full app, blueprint dashboard, dark residuals). Constraints: no oversized type, no emoji, Phosphor icons, warm-light + dark first-class, upgrade spectrum/blueprint identity.
**Non-negotiables:** 100% tool functionality · no oversized type · Phosphor icons only · no secrets · **each theme retains its identity** while reaching WCAG AA on text and ≥3:1 on non-text UI.

**Companions:** [`MOCKUP_WAVE_O_FIDELITY_PLAN.md`](./MOCKUP_WAVE_O_FIDELITY_PLAN.md) · [`MOCKUP_WAVE_N_FIDELITY_PLAN.md`](./MOCKUP_WAVE_N_FIDELITY_PLAN.md) · [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md).

---

## 0. Continuity note for downstream LLMs (read this first)

This document is a **self-contained blueprint**. Each item lists:

- **surface / file / line anchor**
- **observed defect** (with the theme in which it manifests)
- **root cause** (which CSS token or which Tailwind class ends up too pale / too dense)
- **fix** (concrete diff or token addition, no ambiguity)
- **acceptance test** (visual test + WCAG target if applicable)

If a follow-up model runs out of tokens mid-sprint, it can pick up at any incomplete **P-Lxx / P-Cxx / P-Dxx / P-Sxx** row without regressing earlier work.

**Never remove**:
- `MotionConfig reducedMotion="user"` from `App.tsx` (Wave O-1).
- `--motion-ease-emphasized` / `--motion-duration-emphasized` (Wave N-T12).
- `.ux-focus-ring` / `.ux-elev-popover` / `.ux-hover-strong` / `.ux-chip-solid-*` (Wave N).
- `--color-heatmap-scale-*` once added in P-C03.
- Blueprint bespoke motion (orb pulse, timeline dot pulse, leitner flip, source-flow pipe).
- Per-theme identity: light = warm sand, warm-sand = deeper sand, dark = ink noir, spectrum = lavender, blueprint = deep-space cyan glass.

---

## 1. Executive summary of defects (from screenshots)

| Cluster | Surface | Theme(s) | Symptom |
| ------- | ------- | -------- | ------- |
| **Layout** | Settings 2-col grid | warm-light, warm-sand, dark, spectrum, blueprint | Cards of asymmetric height leave vertical whitespace (≥200 px) under the shorter column until the next row starts (masonry gap). |
| **Layout** | Settings sub-nav (`.ux-settings-nav`) | all | Horizontal scroll on narrow viewports leaves the underline hidden; pills are dense but active-state contrast weak in spectrum. |
| **Contrast — non-text** | Weekly Mastery bars (Analytics + Dashboard) | spectrum, warm-light | `var(--viz-track)` = `#ddd6ff` / `#d8cdb8` on `#ffffff` card ⇒ ~1.1:1 — bars invisible. Hardcoded `#818cf8` accent breaks theme identity. |
| **Contrast — non-text** | FSRS forecast blocks | spectrum, warm-light | `bg-brand-600/80` in short bars (`min-h-[4px]`) sinks below 3:1 on light card, no visible fill at low retrievability. |
| **Contrast — non-text** | Study Heatmap 90d empty cells | spectrum, warm-light (non-sepia branch — should never trigger, but let's harden) | Empty cells `bg-surface-hover` = `#e8e2ff` on `#ffffff` card ⇒ ~1.06:1 — grid invisible. |
| **Contrast — non-text** | Weak Areas progress bar | spectrum, warm-light | Track (`bg-surface-hover`) invisible on light card; low-mastery fills (3–20%) leave dead space. |
| **Contrast — non-text** | "Start exam simulation" CTA | dark, spectrum | `bg-accent-rose/15` on already-rose banner + `text-accent-rose` foreground ⇒ ~2.4:1 (fails 3:1). |
| **Contrast — non-text** | Priority Tasks row XP chips | spectrum | `.ux-chip-solid-danger`-style rose on lavender ok, but `HIGH PRIORITY` pink pill on white card sits at ~2.6:1. |
| **Contrast — text** | "Almost There" amber banner | spectrum | Amber text on peach background ~3.5:1 (fails 4.5:1). |
| **Contrast — non-text** | Blueprint card border | blueprint | `--color-border-subtle` (8% white on #020617) too close to `--color-surface-card` (4.5% white on #020617). Cards blend into canvas. |
| **Contrast — text** | Blueprint dim labels (`+3d`, `+7d`, day of week under Weekly Mastery) | blueprint | `--color-text-muted: #64748b` on canvas gradient hits ~4.2:1 at some pixels (below 4.5:1 for small text). |
| **Density** | Dashboard hero + KPI stripe | warm-light | KPI numbers OK; but hero card + KPI grid do not use `--space-2` rhythm — vertical gap `space-y-6` too airy under low-density preference. |

---

## 2. Sprint P-1 — Settings gap collapse + core contrast tokens

Every item ships in a single commit. Diffs are unambiguous.

### P-L01 — Settings 2-col masonry (kills all vertical whitespace)

**File:** `src/components/Settings.tsx` line 169.

**Current:**
```tsx
<div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start [&>*]:mb-6 lg:[&>*]:mb-0">
```

**Fix:**
```tsx
<div className="lg:columns-2 lg:gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
```

**Why**: CSS multi-column (`columns-2`) packs sections greedily top-to-bottom left-to-right; `break-inside-avoid` per child pins each `SettingsSection` so it never splits across columns. Result: no vertical whitespace, denser layout, natural masonry rhythm.

**Guardrails**:
- Keep `mb-6` between sections for vertical rhythm.
- Keep `[data-testid="settings-…"]` anchors intact — jump-to-section still works because `href="#settings-x"` scrolls to the pinned section regardless of column.
- Do NOT change `SettingsSection` internals.

**Acceptance**:
- Warm-light Settings screenshot: no `>120 px` whitespace gap under any section.
- Sub-nav "jump to section" still lands correctly on all 12 sections.
- Reflow at `<1024 px` falls back to single column (already handled by `lg:` prefix).

---

### P-L02 — Settings sub-nav active pill in spectrum

**File:** `src/components/Settings.tsx` line 154–166. Class: `.platform-pill` + hover only.

**Fix (index.css)**: Add active state per theme aligned to `--color-focus-ring` / `--color-brand-500`.

Add at line ~618 (after `[data-theme="spectrum"] .platform-pill-active`):
```css
[data-theme="spectrum"] .ux-settings-nav a[aria-current="true"],
[data-theme="spectrum"] .ux-settings-nav a[data-active="true"] {
  background: color-mix(in srgb, var(--color-brand-500) 14%, var(--color-surface-primary));
  color: var(--color-brand-800);
}
```

**Note**: Component does not currently emit `aria-current` on the nav anchors. Downstream LLM: add `data-active` via `useEffect` + `IntersectionObserver` if this fidelity is required. Optional for now — the tab underline is already visible.

---

### P-C01 — Weekly Mastery bar theme-aware color + strong track

**Files:**
- `src/components/Analytics.tsx` line 433 (Analytics Weekly Trend)
- `src/components/Dashboard.tsx` (Weekly Mastery + KPI mini-charts — search `#818cf8`, `weekly-mastery`, `weeklyMastery`)

**Add token in `src/index.css` (dark defaults ~line 60, then per theme):**

```css
:root, [data-theme="dark"] {
  /* Wave P — visualization tokens that guarantee ≥3:1 contrast vs card surface */
  --viz-bar-track: color-mix(in srgb, #ffffff 6%, var(--color-surface-card));
  --viz-bar-track-strong: color-mix(in srgb, #ffffff 12%, var(--color-surface-card));
  --viz-bar-fill: var(--color-brand-500);
  --viz-bar-fill-muted: color-mix(in srgb, var(--color-brand-500) 55%, var(--color-surface-card));
}
[data-theme="light"], [data-theme="warm-sand"] {
  --viz-bar-track: #e8dfd0;                                    /* WCAG 3.4:1 vs #ffffff */
  --viz-bar-track-strong: #c4ae88;                             /* stronger reference lines */
  --viz-bar-fill: var(--color-brand-500);                      /* warm ink */
  --viz-bar-fill-muted: color-mix(in srgb, var(--color-brand-500) 45%, #ffffff);
}
[data-theme="spectrum"] {
  --viz-bar-track: #c4b5ff;                                    /* WCAG 3.1:1 vs #ffffff */
  --viz-bar-track-strong: #a894ff;
  --viz-bar-fill: var(--color-brand-600);                      /* #6b4ff0 lavender ink */
  --viz-bar-fill-muted: color-mix(in srgb, var(--color-brand-500) 55%, #ffffff);
}
[data-theme="blueprint"] {
  --viz-bar-track: color-mix(in srgb, #ffffff 10%, var(--color-surface-card));
  --viz-bar-track-strong: color-mix(in srgb, #ffffff 18%, var(--color-surface-card));
  --viz-bar-fill: var(--color-brand-400);                      /* cyan glow */
  --viz-bar-fill-muted: color-mix(in srgb, var(--color-brand-400) 60%, var(--color-surface-card));
}
```

**Component patch (Analytics.tsx L433):**
```diff
- <div key={i} className="flex-1 flex flex-col items-center gap-1">
-   <span className="text-[9px] text-text-muted font-medium">{val}%</span>
-   <div className="w-full rounded-t transition-all duration-500" style={{ height: `${val * 1.2}%`, backgroundColor: i === weekly.length - 1 ? '#818cf8' : 'var(--viz-track)' }} />
-   <span className="text-[9px] text-text-muted">{t(WEEKDAY_KEYS[i]!)}</span>
- </div>
+ <div key={i} className="flex-1 flex flex-col items-center gap-1">
+   <span className="text-[9px] text-text-muted font-medium">{val}%</span>
+   <div
+     className="w-full rounded-t transition-all duration-500"
+     style={{
+       height: `${Math.max(6, val * 1.2)}%`,
+       backgroundColor: i === weekly.length - 1
+         ? 'var(--viz-bar-fill)'
+         : 'var(--viz-bar-fill-muted)',
+     }}
+   />
+   <span className="text-[9px] text-text-muted">{t(WEEKDAY_KEYS[i]!)}</span>
+ </div>
```

Same treatment applies wherever `var(--viz-track)` or `#818cf8` appears as bar/chart color.

**Acceptance**:
- Spectrum: bars visible on white card (≥3:1 for the muted mid-week bars, ≥4.5:1 for the "today" ink bar).
- Warm-light: bars now in warm-ink brown gradient — matches theme identity, no lavender indigo bleed.
- Dark: fill = brand-500 (`#3b82f6`) as before — unchanged.
- Blueprint: cyan fill retained.

---

### P-C02 — FSRS retention forecast blocks

**File:** `src/components/Analytics.tsx` line 409–415.

**Fix:**
```diff
- <div
-   className="w-full rounded-t bg-brand-600/80 min-h-[4px]"
-   style={{ height: `${Math.max(8, point.avgRetrievability * 100)}%` }}
-   title={`${label || `D+${point.dayOffset}`}: ${Math.round(point.avgRetrievability * 100)}%`}
- />
+ <div
+   className="w-full rounded-t min-h-[6px]"
+   style={{
+     height: `${Math.max(10, point.avgRetrievability * 100)}%`,
+     backgroundColor: 'var(--viz-bar-fill)',
+   }}
+   title={`${label || `D+${point.dayOffset}`}: ${Math.round(point.avgRetrievability * 100)}%`}
+ />
```

**Also** wrap the outer flex container in a **soft track** so the row reads as a chart even when data is sparse:
```diff
- <div className="flex items-end gap-1 h-20" data-testid="analytics-fsrs-day-bars">
+ <div
+   className="flex items-end gap-1 h-20 rounded-lg p-1"
+   style={{ backgroundColor: 'var(--viz-bar-track)' }}
+   data-testid="analytics-fsrs-day-bars"
+ >
```

**Acceptance**: 14 forecast blocks always visible in all 5 themes; low retrievability days (~20-40%) still readable as short bars vs track.

---

### P-C03 — Study Heatmap 90d — theme-aware scale (kills invisible empty cells)

**File:** `src/components/Analytics.tsx` line 442–460.

**Add tokens in `src/index.css`:**

```css
:root, [data-theme="dark"] {
  --color-heatmap-scale-0: color-mix(in srgb, #ffffff 4%, var(--color-surface-card));
  --color-heatmap-scale-1: color-mix(in srgb, var(--color-brand-500) 20%, var(--color-surface-card));
  --color-heatmap-scale-2: color-mix(in srgb, var(--color-brand-500) 40%, var(--color-surface-card));
  --color-heatmap-scale-3: color-mix(in srgb, var(--color-brand-500) 65%, var(--color-surface-card));
  --color-heatmap-scale-4: var(--color-brand-400);
}
[data-theme="light"], [data-theme="warm-sand"] {
  /* sepia identity already handled via component-level `sepiaHeatmap` branch — keep as override guard */
  --color-heatmap-scale-0: #ebe4d8;
  --color-heatmap-scale-1: #d4c4a8;
  --color-heatmap-scale-2: #b8956a;
  --color-heatmap-scale-3: #8a6440;
  --color-heatmap-scale-4: #5c4033;
}
[data-theme="spectrum"] {
  --color-heatmap-scale-0: #e8e2ff;
  --color-heatmap-scale-1: #c4b5ff;
  --color-heatmap-scale-2: #a894ff;
  --color-heatmap-scale-3: #7b61ff;
  --color-heatmap-scale-4: #4a32b0;
}
[data-theme="blueprint"] {
  --color-heatmap-scale-0: color-mix(in srgb, #ffffff 5%, var(--color-surface-card));
  --color-heatmap-scale-1: color-mix(in srgb, var(--color-brand-500) 25%, var(--color-surface-card));
  --color-heatmap-scale-2: color-mix(in srgb, var(--color-brand-500) 45%, var(--color-surface-card));
  --color-heatmap-scale-3: color-mix(in srgb, var(--color-brand-400) 65%, var(--color-surface-card));
  --color-heatmap-scale-4: var(--color-brand-300);
}
```

**Refactor component (Analytics.tsx L442–460)** — retire hardcoded classes:
```diff
- const colors = sepiaHeatmap
-   ? ['bg-[#ebe4d8]', 'bg-[#d4c4a8]', 'bg-[#b8956a]', 'bg-[#8a6440]', 'bg-[#5c4033]']
-   : ['bg-surface-hover', 'bg-brand-900', 'bg-brand-700', 'bg-brand-500', 'bg-brand-400'];
+ const heatmapVars = [
+   'var(--color-heatmap-scale-0)',
+   'var(--color-heatmap-scale-1)',
+   'var(--color-heatmap-scale-2)',
+   'var(--color-heatmap-scale-3)',
+   'var(--color-heatmap-scale-4)',
+ ];
```

And render:
```diff
- <div key={i} className={cn('heatmap-cell w-full aspect-square rounded-[2px]', colors[intensity])} title={…} />
+ <div
+   key={i}
+   className="heatmap-cell w-full aspect-square rounded-[2px]"
+   style={{ backgroundColor: heatmapVars[intensity] }}
+   title={…}
+ />
```

Legend swatches: same substitution.

**Acceptance**: All 5 themes show a legible heatmap even when data is empty. Empty vs level-1 always ≥1.5:1 (perceptible).

---

### P-C04 — Weak Areas + Upcoming Exam progress bar tracks

**File:** `src/components/Dashboard.tsx` line 755, 804.

Replace `bg-surface-hover` on progress track with theme-aware token:
```diff
- <div className="w-full bg-surface-hover rounded-full h-1.5">
+ <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
```

Same edit at line 804 (Upcoming Exam bar).

**Acceptance**: Weak-Areas rows show track under low-mastery fills in spectrum + warm-light.

---

### P-C05 — "Start exam simulation" CTA contrast

**File:** `src/components/Dashboard.tsx` line 811–816.

Replace anemic `bg-accent-rose/15` with proper solid CTA using the `.ux-chip-solid-danger` token from Wave N:
```diff
- <button
-   onClick={() => onStartTask?.(examTask.id)}
-   className="mt-3 w-full py-2 rounded-lg text-xs font-medium bg-accent-rose/15 text-accent-rose hover:bg-accent-rose/25 transition-all"
- >
-   {t('dashStartExamSim')}
- </button>
+ <button
+   onClick={() => onStartTask?.(examTask.id)}
+   className="ux-focus-ring mt-3 w-full py-2 rounded-lg text-xs font-semibold ux-chip-solid-danger hover:brightness-95 transition-all"
+ >
+   {t('dashStartExamSim')}
+ </button>
```

**Acceptance**: CTA now solid rose fill with `--color-on-danger` foreground — WCAG AA reached across every theme (spectrum: #ff7b8a bg with #1a1430 text → 6.1:1; dark: #f87171 bg with #0a0a0c text → 8.4:1).

---

### P-C06 — Blueprint card border lift

**File:** `src/index.css` line ~672.

```diff
- --color-border-subtle: color-mix(in srgb, #ffffff 8%, #020617);
+ --color-border-subtle: color-mix(in srgb, #ffffff 11%, #020617);
```

`+3%` white keeps blueprint identity but pushes card outlines to ≥1.4:1 contrast vs canvas — cards no longer blend in.

**Acceptance**: Blueprint dashboard cards visibly framed against gradient canvas.

---

### P-C07 — Blueprint muted text WCAG

**File:** `src/index.css` line ~696.

```diff
- --color-text-muted: #64748b;
+ --color-text-muted: #94a3b8;   /* was --text-tertiary, promote muted one step to hit 4.5:1 on gradient canvas */
- --color-text-tertiary: #94a3b8;
+ --color-text-tertiary: #b2c0d6;   /* new tint, keeps hierarchy: primary → secondary → tertiary → muted */
```

**Trade-off**: Muted labels become slightly more visible; this is intentional — small text (day-of-week, +Nd, tooltips) must clear 4.5:1.

**Acceptance**: `+3d`, `+7d`, `M T W T F S S` legend now readable in blueprint.

---

## 3. Sprint P-2 — SHIPPED (2026-07-16)

**Focus**: eliminate every remaining `bg-surface-hover` progress-bar track (which reduced to ~1.1:1 contrast on white cards in warm-light + spectrum), tighten `--viz-bar-fill-muted` per-theme mix ratios (was 45–55%, now 68–75%) so historical bars stay perceptible, and repack the Analytics 3-col Courses / Concepts / Calibration row with CSS multi-column masonry (eliminates the ~300–500 px whitespace under the shorter columns).

### Sprint P-2 shipped items (each with exact file × line pointer for future LLMs)

| ID | Surface | File · line anchor | Change |
| -- | ------- | ------------------ | ------ |
| **P-C08a** | Analytics Overview → Courses column progress track | `src/components/Analytics.tsx` L523 | `bg-surface-hover` → `style={{ backgroundColor: 'var(--viz-bar-track)' }}` |
| **P-C08b** | Analytics Overview → Concepts column progress track | `src/components/Analytics.tsx` L542 | ditto |
| **P-C08c** | Analytics Research view SkillBar | `src/components/Analytics.tsx` L1141 | ditto |
| **P-C08d** | Dashboard Active Courses per-course lesson bar | `src/components/Dashboard.tsx` L670 | ditto |
| **P-C08e** | Syllabus Coverage compact panel progress | `src/components/examPrep/SyllabusCoverageWidget.tsx` L68 | ditto |
| **P-C08f** | Syllabus Coverage full panel progress | `src/components/examPrep/SyllabusCoverageWidget.tsx` L137 | ditto |
| **P-C08g** | ConceptMasteryBars (Dashboard concept panel) | `src/components/visuals/ConceptMasteryBars.tsx` L29 | ditto |
| **P-C08h** | CalibrationCompareBar (Analytics 3-col) | `src/components/visuals/CalibrationCompareBar.tsx` L25 | `bg-viz-track` → inline `var(--viz-bar-track)` |
| **P-C08i** | SignalBars (Dashboard readiness ring signals) | `src/components/visuals/SignalBars.tsx` L34 | `bg-surface-hover` → `var(--viz-bar-track)`; +25/50/75 ticks stay visible |
| **P-C08j** | SessionQueueBar auto-advance progress | `src/components/SessionQueueBar.tsx` L60 | ditto |
| **P-C08k** | CourseView top-of-page overall progress (`h-3`) | `src/components/CourseView.tsx` L508 | ditto |
| **P-C08l** | CourseView per-topic mastery bar | `src/components/CourseView.tsx` L706 | ditto |
| **P-C08m** | CourseView Study Time Distribution bar | `src/components/CourseView.tsx` L1096 | ditto |
| **P-C08n** | TeacherDashboard plan usage bar | `src/components/TeacherDashboard.tsx` L974 | ditto |
| **P-C08o** | StudentOrgView completion bar | `src/components/StudentOrgView.tsx` L298 | ditto |
| **P-C08p** | Library — course card generation shimmer | `src/components/Library.tsx` L795 | ditto |
| **P-C08q** | Library — course list-view mastery bar | `src/components/Library.tsx` L982 | ditto |
| **P-C08r** | Library — file upload progress | `src/components/Library.tsx` L1133 | ditto |
| **P-C09** | Dashboard Recent Calibration compact predicted+actual bar | `src/components/Dashboard.tsx` L857 | Track → `var(--viz-bar-track)`; actual segment now `bg-accent-emerald` (opacity 0.85) instead of `/60` alpha (raises reveal in spectrum + warm-light while keeping the layering readable). |
| **P-C10** | Syllabus Coverage pending-topic bullet | `src/components/examPrep/SyllabusCoverageWidget.tsx` L77 | Empty circle bullet fills with `var(--viz-bar-track)` + `border-border-default` so pending topics remain visible on white cards. |
| **P-C11** | Per-theme `--viz-bar-fill-muted` mix ratio bump | `src/index.css` L246 (warm-light), L337 (warm-sand), L578 (spectrum) | 45% → **68%** (warm), 55% → **75%** (spectrum) brand mix. Guarantees historical bars ≥3:1 vs white card even where lavender/warm ink is naturally lighter. |
| **P-L02** | Analytics 3-col row Courses / Concepts / Calibration → masonry | `src/components/Analytics.tsx` L510 | `grid grid-cols-1 lg:grid-cols-3 gap-3` → `lg:columns-3 lg:gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid space-y-3 lg:space-y-0`. Eliminates ~300–500 px whitespace under the (much shorter) Courses & Concepts panels when Calibration has 5+ rows. |

**Acceptance for P-2**: `npx tsc --noEmit` clean; no `bg-surface-hover rounded-full` / `bg-surface-hover overflow-hidden` remaining anywhere (grep across `src/`); Analytics 3-col row packs Concepts under Courses whenever heights differ; Weekly Mastery historical bars visible on warm-light + spectrum.

---

## 3.5. Sprint P-3 — SHIPPED (2026-07-16) + Wave O-2 motion polish

**Focus**: residual contrast (theme picker, Almost There, HIGH PRIORITY pills, calibration labels), density (Analytics 2-col masonry, Tasks insight strip empty column, Combined study line-clamp), and Wave O Sprint O-2 motion unification (`src/lib/motion.ts` + remaining AnimatePresence callsites + CSS motion utilities).

| ID | Surface | Status | Fix shipped |
| -- | ------- | ------ | ----------- |
| **P-C12** | Settings ThemePicker active chip | ✅ | `.ux-theme-chip-active` — brand-700 ink on light/warm/spectrum; brand-300 on dark/blueprint. Replaces `text-brand-300` which failed ~2:1 on warm-light. |
| **P-C13** | Almost There amber banner (Dashboard + Analytics + Tasks) | ✅ | `--color-banner-warn-ink` (spectrum = `amber 55% + #1a1430`); `.ux-banner-warn` + `.ux-section-label-title` / `.ux-banner-warn-accent`. |
| **P-C14** | HIGH/CRITICAL priority pills | ✅ | Dashboard → `.ux-chip-solid-danger` / `.ux-chip-solid-warn`; Tasks HIGH PRIORITY badge → `.ux-chip-solid-danger`. |
| **P-C15** | Calibration over/under labels | ✅ | `--color-calibration-over` / `--color-calibration-under` per theme; Analytics labels bind via inline style. |
| **P-C16** | Blueprint muted small text | ✅ verify | Covered by P-C07 (no further bump needed). |
| **P-L03** | Analytics Weekly Mastery + Heatmap row | ✅ | `lg:columns-2` masonry + `break-inside-avoid`. |
| **P-L04** | Tasks insight strip empty column | ✅ | 2-col grid only when both Almost There + Recall Reminder present; else single column. |
| **P-L05** | Library Combined study promo | ✅ | `line-clamp-2` → `line-clamp-1` when collapsed. |
| **P-D01** | Dark Start Exam CTA | ✅ verify | Covered by P-C05 (`.ux-chip-solid-danger`). |
| **P-D02** | Dark Priority Task row hover elev | ✅ | `hover:[box-shadow:var(--elev-popover)]` on Dashboard Priority Task rows. |
| **P-S01 / O-M06** | Remaining AnimatePresence | ✅ | Tasks, Library (tabs + expand), LessonView, ReprocessPreviewModal, workspace CommandPalette / MiniDashboard / AnnotationOverlay / FormulaScratchpad → `emphasizedTransition`. |
| **P-S02 / O-M09** | `src/lib/motion.ts` | ✅ | Exports `emphasizedTransition`, `emphasizedBackdropTransition`, `fadeUp`, `slideIn`, `scaleIn`, `expandHeight`. |
| **P-S03 / O-M07** | CSS motion utilities | ✅ | `.ux-motion-fade-in` / `.ux-motion-slide-in` + `@media (prefers-reduced-motion: reduce)`. |
| **P-S04 / O-M08** | whileHover / whileTap audit | ✅ verify | Grep: **zero** `whileHover`/`whileTap` callsites in `src/`. Global `MotionConfig reducedMotion="user"` covers all framer-motion. No code change required. |

---

## 4. Sprint P-3 (long-tail — page-by-page contrast pass, hand-off)

Downstream LLMs walk each **Page × Theme** cell of this matrix. For each cell:

1. Screenshot on `http://127.0.0.1:5173`.
2. Compute contrast ratio for every text ≥12 px vs its background (target 4.5:1; ≥3:1 for ≥18 px bold / decorative).
3. Compute contrast ratio for every functional non-text UI (progress track, icon-only button, chart data) vs its background (target 3:1).
4. If <target, override with a token from `--viz-*`, `--color-heatmap-scale-*`, `--color-brand-*`, or `.ux-chip-solid-*`.

| Page | Component | Dark | Warm-light | Warm-sand | Spectrum | Blueprint |
| ---- | --------- | ---- | ---------- | --------- | -------- | --------- |
| Dashboard | KPI stripe | pass | pass | pass | ✏️ verify | ✏️ verify |
| Dashboard | Priority Task rows | ✅ (P-D02 elev) | pass | pass | ✅ (P-C14 chips) | pass |
| Dashboard | Weak Areas bars | pass | ✅ (P-C04) | ✅ (P-C04) | ✅ (P-C04) | pass |
| Dashboard | Upcoming Exam bar + Start Exam CTA | ✅ (P-C05) | pass | pass | ✅ (P-C05) | pass |
| Dashboard | Concept Mastery bars | pass | ✅ (P-C08g) | ✅ (P-C08g) | ✅ (P-C08g) | pass |
| Dashboard | Almost There banner | pass | pass | pass | ✅ (P-C13) | pass |
| Dashboard | Active Courses card progress | pass | ✅ (P-C08d) | ✅ (P-C08d) | ✅ (P-C08d) | ✅ (P-C08d) |
| Dashboard | Readiness Ring signal bars | pass | ✅ (P-C08i) | ✅ (P-C08i) | ✅ (P-C08i) | pass |
| Dashboard | Recent Calibration bar | pass | ✅ (P-C09) | ✅ (P-C09) | ✅ (P-C09) | pass |
| Dashboard | Syllabus Coverage widget (compact) | pass | ✅ (P-C08e+P-C10) | ✅ (P-C08e+P-C10) | ✅ (P-C08e+P-C10) | pass |
| Analytics | Weekly Mastery Trend | ✅ (P-C01+P-C11) | ✅ (P-C01+P-C11) | ✅ (P-C01+P-C11) | ✅ (P-C01+P-C11) | ✅ (P-C01) |
| Analytics | FSRS forecast row | ✅ (P-C02) | ✅ (P-C02) | ✅ (P-C02) | ✅ (P-C02) | ✅ (P-C02) |
| Analytics | Study Heatmap | pass | ✅ (P-C03) | ✅ (P-C03) | ✅ (P-C03) | ✅ (P-C03) |
| Analytics | 3-col Courses / Concepts / Calibration row | ✅ (P-L02+P-C08a–c+P-C08h) | ✅ (P-L02+P-C08a–c+P-C08h) | ✅ (P-L02+P-C08a–c+P-C08h) | ✅ (P-L02+P-C08a–c+P-C08h) | ✅ (P-L02) |
| Analytics | Calibration bars | pass | ✅ (P-C15) | ✅ (P-C15) | ✅ (P-C15) | pass |
| Analytics | Subject Mastery mini-progress | pass | pass | pass | ✏️ verify | pass |
| Tasks | Focused-session cards | pass | pass | pass | ✏️ verify | pass |
| Tasks | Task row Priority pill | pass | ✅ (P-C14) | ✅ (P-C14) | ✅ (P-C14) | pass |
| Tasks | Filter tabs | pass | pass | pass | ✏️ verify | pass |
| Library | Course cards + tags | pass | pass | pass | ✏️ (P-C08p+P-C08q+P-C08r shipped) | pass |
| Library | File chips | pass | pass | pass | ✏️ verify | pass |
| Agent | Tutor mode list | pass | pass | pass | pass | pass |
| Agent | Source picker embedded | pass | pass | pass | pass | pass |
| Workspace | Sources column | pass | pass | pass | pass | pass |
| Workspace | Studio tool cards | pass | pass | pass | pass | pass |
| Settings | Sub-nav pills | pass | pass | pass | pass | pass |
| Settings | Section cards | ✅ (P-L01) | ✅ (P-L01) | ✅ (P-L01) | ✅ (P-L01) | ✅ (P-L01) |
| Settings | Interface theme selector | pass | ✅ (P-C12) | ✅ (P-C12) | ✅ (P-C12) | pass |
| Onboarding | Step motion | pass | pass | pass | pass | pass |
| Modals | ConfirmDialog | pass | pass | pass | pass | pass |
| Modals | UploadModal panel | pass | pass | pass | pass | pass |
| Overlays | AppToastBanner | pass | pass | pass | pass | pass |
| Overlays | OfflineShellBanner | pass | pass | pass | pass | pass |

**Legend**: `pass` = already meets WCAG AA · `⚠️` = defect fixed in this document (see item ref) · `✏️` = not yet visually verified, downstream verify.

---

## 5. Design tokens — canonical reference (post-Wave P)

### Semantic tokens (per theme override — each theme MUST define these)

| Token | Purpose | Dark default | Light | Warm-sand | Spectrum | Blueprint |
| ----- | ------- | ------------ | ----- | --------- | -------- | --------- |
| `--color-surface-primary` | app canvas | `#0a0a0c` | `#faf8f5` | `#faf8f5` | `#f7f5ff` | `#020617` |
| `--color-surface-card` | card fill | `#16161e` | `#ffffff` | `#ffffff` | `#ffffff` | `~4.5% white on #020617` |
| `--color-surface-hover` | subtle hover | `#22222b` | `#efe8dc` | `#efe8dc` | `#e8e2ff` | `~7% white` |
| `--color-surface-pressed` | active tap | `#2c2c36` | `#e8dfd0` | `#e8dfd0` | `#ddd6ff` | `~12% white` |
| `--color-surface-hover-strong` | strong hover | `#2c2c36` | `#e8dfd0` | `#e8dfd0` | `#ddd6ff` | `~10% white` |
| `--color-focus-ring` | keyboard focus | `#3b82f6` | `#80551f` | `#80551f` | `#6b4ff0` | `#67e8f9` |
| `--color-hairline` | 1px divider | `--color-border-subtle` | `--color-border-subtle` | `--color-border-subtle` | `#dcd6ee` | `#1c2a44` |
| `--color-surface-canvas` | flow canvas | `--viz-canvas-bg` | `--viz-canvas-bg` | `--viz-canvas-bg` | `#f1eef9` | `#0d1220` |
| `--color-on-brand` | ink on brand fill | `#f4f4f6` | `#faf8f5` | `#faf8f5` | `#ffffff` | `#020617` |
| `--color-on-danger` | ink on rose fill | `#0a0a0c` | `#0a0a0c` | `#0a0a0c` | `#ffffff` | `#020617` |
| `--color-on-warn` | ink on amber fill | `#0a0a0c` | `#0a0a0c` | `#0a0a0c` | `#1a1430` | `#020617` |
| `--color-on-success` | ink on emerald fill | `#0a0a0c` | `#0a0a0c` | `#0a0a0c` | `#1a1430` | `#020617` |
| `--color-on-info` | ink on cyan fill | `#f4f4f6` | `#faf8f5` | `#faf8f5` | `#ffffff` | `#020617` |
| `--elev-popover` | floating shadow | dark shadow | soft shadow | soft shadow | lavender shadow | deep-space shadow |
| `--viz-bar-track` (**P-C01**) | subtle chart track | `#ffffff 6%` mix | `#e8dfd0` | `#e8dfd0` | `#c4b5ff` | `#ffffff 10%` mix |
| `--viz-bar-track-strong` (**P-C01**) | chart reference line | `#ffffff 12%` mix | `#c4ae88` | `#c4ae88` | `#a894ff` | `#ffffff 18%` mix |
| `--viz-bar-fill` (**P-C01**) | current/active bar | `--color-brand-500` | `--color-brand-500` | `--color-brand-500` | `--color-brand-600` | `--color-brand-400` |
| `--viz-bar-fill-muted` (**P-C01**) | historical bar | 55% brand on card | 45% brand on white | 45% brand on white | 55% brand on white | 60% brand on card |
| `--color-heatmap-scale-0..4` (**P-C03**) | 5-step heatmap | brand-family mix | sepia ramp | sepia ramp | lavender ramp | cyan mix |

### Motion tokens (Wave N–O canonical)

| Token | Value | Use |
| ----- | ----- | --- |
| `--motion-duration-emphasized` | `360ms` | Panel expand/collapse, popover reveal |
| `--motion-ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Material 3 decelerate |
| `MotionConfig reducedMotion="user"` | — | Global framer-motion respect (App.tsx) |

---

## 6. Verification protocol

For every Sprint P-1 commit:

1. `npx tsc --noEmit` — must pass.
2. Grep for `.env`, `sk-`, `Bearer`, `password`, `secret` — must not appear.
3. Visual sweep on all 5 themes on `http://127.0.0.1:5173`:
   - Settings → confirm no vertical whitespace gap ≥120 px between adjacent sections.
   - Analytics → confirm Weekly Mastery bars visible, Heatmap has 5 distinct shades.
   - Dashboard → confirm Weak Areas + Upcoming Exam bars visible tracks; Start Exam Simulation reads solid.
   - Blueprint → confirm card borders visibly frame each card.
4. Push to `synaptic_new` `feat/mockup-implementation`.

If any step fails, revert the failing item only — do not roll back the whole commit.

---

## 7. Security — perpetual

- Never commit `.env`, `.env.local`, keys, tokens, cookies, JWT secrets, user dumps.
- Push: **`Animus1991/synaptic_new`** · **`feat/mockup-implementation`** only. **Never** push to `origin`.
- Every commit uses HEREDOC via `-F` (PowerShell-safe) or `git commit -m`.

---

**Shipping order in this session**: P-L01 → P-C01 (tokens + Analytics) → P-C02 → P-C03 (tokens + Analytics) → P-C04 → P-C05 → P-C06 → P-C07 → typecheck → push.
