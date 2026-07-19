# Mockup → Production Implementation Plan

> **Σκοπός:** Πλήρης οδηγός μετατροπής των 4 mockup οθονών
> (`artifacts/mockup-sandbox/src/components/mockups/synapse-ux/`) σε
> παραγωγικά components (`artifacts/synapse-learning/`).  
> Κάθε μελλοντικός agent ή developer ξεκινά από εδώ.

---

## Κεφάλαιο 0 — Γενικές Αρχές & Θεματολογία

### Design Tokens

Τα mockups χρησιμοποιούν `--syn-*` CSS variables ορισμένες στο `_group.css`.  
Στο production αυτά αντιστοιχούν στα theme presets που αρχικοποιεί η `initThemeEarly`:

| Mockup token | Production CSS var | Σημασία |
|---|---|---|
| `--syn-bg` | `--syn-bg` / `--palette-bg` | Background surface |
| `--syn-surface` | `--syn-surface` | Card background |
| `--syn-surface-2` | `--syn-surface-2` | Secondary surface / hover |
| `--syn-border` | `--syn-border` | 1px card borders |
| `--syn-border-2` | `--syn-border-2` | Stronger separators |
| `--syn-text` | `--syn-text` | Primary text |
| `--syn-text-2` | `--syn-text-2` | Secondary text |
| `--syn-text-3` | `--syn-text-3` | Muted / icon color |
| `--syn-brand` | `--color-brand-600` | Primary action color |
| `--syn-brand-dark` | `--color-brand-700` | Hover state |
| `--syn-brand-light` | `--color-brand-50` | Selected / tinted bg |
| `--syn-emerald` | `--palette-green` | Success / high mastery |
| `--syn-emerald-bg` | `--palette-green-bg` | Success tinted bg |
| `--syn-amber` | `--palette-amber` | Warning / medium mastery |
| `--syn-amber-bg` | `--palette-amber-bg` | Warning tinted bg |
| `--syn-rose` | `--palette-rose` | Error / critical / low mastery |
| `--syn-rose-bg` | `--palette-rose-bg` | Error tinted bg |
| `--syn-slate` | `--palette-teal` | Info / neutral stats |
| `--syn-slate-bg` | `--palette-teal-bg` | Info tinted bg |
| `--syn-violet` | `--palette-violet` | AI / premium accent |
| `--syn-violet-bg` | `--palette-violet-bg` | AI tinted bg |

**Κανόνας:** Ποτέ μη βάλεις raw hex σε production components — πάντα `var(--syn-*)` ή τα production equivalents.  
**Εξαίρεση:** Tasks page Warm Sand → scoped `data-theme="warm-sand"` που override-άρει τα tokens.

### Warm Sand Theme (Tasks)

Το `Tasks.tsx` mockup χρησιμοποιεί hardcoded Warm Sand palette:
- `bg: '#F6F1EA'`, `surface: '#FDFAF6'`, `brand: '#7D6245'`

Στο production αυτό αντιστοιχεί στο `warm-sand` theme preset.  
**Υλοποίηση:** Πρόσθεσε `data-theme="warm-sand"` attribute στο root `<div>` του Tasks page — τα CSS selectors επιλέγουν αυτόματα τα warm palette tokens.

### Τυπογραφία

- Font: **Inter**, system-ui fallback
- Data-dense info: **9–11 px** (labels, badges, meta)
- Section headers: **11–13 px**, `font-weight: 600–700`
- Page H1: **18–20 px**, `font-weight: 700`

### Κανόνας Προσβασιμότητας

- Accent text χρειάζεται `--accent-text-*` inks (WCAG AA) — **όχι** light palette tokens (`-bg` variants) σε κείμενο.
- `aria-busy` για loading states (π.χ. "Έναρξη Συνεδρίας" κατά το workspace boot).
- `aria-pressed` για toggle buttons (view mode, filter pills).

---

## Κεφάλαιο 1 — Mockup → Production Mapping Table

| Mockup αρχείο | Production component | Route / view key |
|---|---|---|
| `Dashboard.tsx` (mockup) | `artifacts/synapse-learning/src/components/Dashboard.tsx` | `dashboard` |
| `Library.tsx` (mockup) | `artifacts/synapse-learning/src/components/Library.tsx` | `library` |
| `Tasks.tsx` (mockup) | `artifacts/synapse-learning/src/components/Tasks.tsx` | `tasks` |
| `Analytics.tsx` (mockup) | `artifacts/synapse-learning/src/components/analytics/` | `analytics` |

---

## Κεφάλαιο 2 — Αναλυτικό Σχέδιο ανά Οθόνη

---

### 2.1 Dashboard (`Dashboard.tsx`)

**Mockup χαρακτηριστικά (τι βλέπουμε):**

- Sticky header bar: logo Brain + "Πίνακας Μάθησης" label, δεξιά: "Χώρος Μελέτης" ghost button + "Έναρξη Συνεδρίας" brand button.
- Greeting row: `"Καλό βράδυ! 👋"` + subtitle με urgent task count + streak ημερών.
- Post-upload banner: brand-colored, με "Workspace" και "Απόκρυψη" CTAs.
- Stats row (5 tiles): Streak days (amber), XP σήμερα (brand), Επαναλήψεις due (slate/clickable), Κατακτήθηκαν έννοιες (violet), Μελέτη σήμερα (emerald).
- Smart CTAs strip (4 κάρτες): Exam prep / Quiz / Κίνδυνος λήθης / Παρανόηση — χρωματισμένες ανά urgency.
- Proactive agent alerts strip.
- Workspace Live Resume: emerald banner με το ενεργό concept + "Συνέχεια" button.
- "Suggested Next Action" callout: emerald left-border, λόγος + CTA.
- 2-column main grid:
  - **Left:** Readiness ring (66%) + signal bars, concept mastery bars + prerequisite repair, priority tasks list, "Needs Fixing" banner, active courses grid, misconception card, weak areas + calibration.
  - **Right:** Syllabus coverage widget, exam calendar, exam countdown.

**Production gaps (τι λείπει ή διαφέρει):**

| Gap | Περιγραφή |
|---|---|
| Greeting hardcoded | Χρειάζεται `greetingForTime(lang, stats.streak)` — **ήδη υπάρχει** στο `lib/greeting.ts` ✓ |
| Post-upload CTA | Υπάρχει `PostUploadBanner` αλλά δεν εμφανίζει "Άνοιξε workspace" CTA μετά το upload στο Library modal |
| Stats row clickable | `Reviews Due` υπάρχει clickable ✓ — verify ότι filter-άρει σωστά |
| Weak areas chips | Δεν ανοίγουν workspace με focus σε concept (`openStudyWorkspaceForConcept`) — η `onFocusWeakArea` prop υπάρχει αλλά δεν εκτελείται από Dashboard |
| `aria-busy` | Υπάρχει ✓ στο "Έναρξη Συνεδρίας" button (`aria-busy={workspaceBooting}`) |
| Daily Focus section | Το mockup δείχνει "Suggested Next Action" — υπάρχει ως `DashboardNextAction` ✓ |
| Active courses grid | Το production δεν έχει mini donut progress ring ανά course card — λείπει οπτικά |

**Βήματα υλοποίησης:**

1. **`DashboardFocusCard`** component: δέχεται task object από store, εμφανίζει subject badge, duration pill, mastery bar, "Ξεκίνα" button που καλεί `startTask`. Τοποθέτηση: `src/components/ui/DashboardFocusCard.tsx`.
2. **`DailyFocusSection`**: χρησιμοποιεί `useStore().nextRecommendedTasks(3)` — εφαρμόζει mockup layout (max 3 κάρτες, scrollable).
3. **`StatsRowClickable`**: verify ότι `onClick={() => setView('tasks', { filter: 'review' })}` λειτουργεί σωστά για Reviews Due tile.
4. **`WeakAreaChip`** onClick: `() => openStudyWorkspaceForConcept(concept)` — περνάει concept string στο `onFocusWeakArea` prop.
5. **`PostUploadCTA`**: εμφανίζεται 2s μετά επιτυχή upload, links σε workspace + course view — extend `PostUploadBanner` component.
6. **Course card mini donut**: SVG circle με `strokeDasharray` για progress — refactor existing course grid cards.
7. **Header `aria-busy`**: Επαλήθευση ότι `workspaceBooting` prop διαρρέει σωστά από App → DashboardActionHub → button.

---

### 2.2 Library (`Library.tsx`)

**Mockup χαρακτηριστικά:**

- Page header: "ΒΙΒΛΙΟΘΗΚΗ" uppercase eyebrow (brand color) + H1 "Μαθήματα & Πηγές" + subtitle.
- Upload CTA (top-right): brand button "Ανέβασμα".
- Global banners: RAG sync progress (slate), post-upload success (emerald, dismissible), NotebookLM import panel, Cross-library synthesis (violet).
- Entry hint (dashed border, dismissible).
- Tabs: "ΜΑΘΗΜΑΤΑ (4)" / "ΑΡΧΕΙΑ (12)" — descriptive tab bar με count.
- Filter pills: ΟΛΑ / ΣΕ ΕΞΕΛΙΞΗ / ΔΗΜΙΟΥΡΓΙΑ / ΟΛΟΚΛΗΡΩΜΕΝΑ / ΠΡΟΣΟΧΗ — state-driven.
- Sort dropdown + Search input.
- View toggle: Grid / List.
- **Course cards (grid):**
  - Icon (32×32, surface-2 bg) + title + status badge (ΜΕΣΑΙΟ / ΔΗΜΙΟΥΡΓΙΑ / ΧΡΕΙΑΖΕΤΑΙ ΑΝΑΘΕΩΡΗΣΗ) σε ελληνικά.
  - Quality score badge: "ΙΣΧΥΡΗ ΠΗΓΗ (85/100)" emerald / "ΧΡΕΙΑΖΕΤΑΙ ΥΛΙΚΟ (45/100)" amber.
  - Gap badge (amber "ΚΕΝΟ ΥΛΗΣ") + Contradiction badge (violet "ΠΑΡΑΝΟΗΣΗ").
  - Description 2-line clamp.
  - Meta stats: lessons count, hours, pending tasks, due reviews.
  - Mastery progress bar + % value.
  - Generating spinner (Loader2 animate-spin) — replaces icon when `isGenerating`.
  - Actions row: "Άνοιγμα" (brand) + "Shell" (eye icon) + Refresh + More.
  - Footer: stats ("59 έννοιες · 42 όροι") + source file tags + "+ Αρχείο" dashed button.
- Mini alert badges: gap (amber) + contradiction (violet) — grid 1×2 below courses.
- Info stacks: topics + prerequisites / examples + enrichments.
- Compact dropzone at bottom.
- Empty state: Upload CTA centered.

**Production gaps:**

| Gap | Περιγραφή |
|---|---|
| Status badge labels | Production χρησιμοποιεί αγγλικά status labels — θέλει i18n mapping για ελληνικά |
| Quality score badge | `sourceQuality.score` υπάρχει στο store αλλά **δεν εμφανίζεται** στο course card |
| Generating spinner | Υπάρχει αλλά card actions δεν disabled όταν `isGenerating` |
| Alert badges (gap/contradiction) | Υπάρχουν ως `MiniAlert` κάτω από grid — **δεν** είναι overlaid στο card corner |
| Empty state | Υπάρχει `PlatformEmptyState` αλλά χωρίς SVG illustration |
| View toggle persist | `viewMode` δεν persist σε localStorage |
| Filter pills store | Filter δεν persist σε localStorage (resets on navigate) |

**Βήματα υλοποίησης:**

1. **`CourseStatusBadge`** component: map `course.processingStatus` → ελληνική ετικέτα + χρώμα σύμφωνα με mockup. File: `src/components/ui/CourseStatusBadge.tsx`.
2. **`QualityScoreBadge`** component: εμφανίζει `course.sourceQuality.score/100` + label (ΙΣΧΥΡΗ/ΧΡΕΙΑΖΕΤΑΙ ΥΛΙΚΟ) με emerald/amber palette. File: `src/components/ui/QualityScoreBadge.tsx`.
3. **`LibraryFilterPills`** localStorage persist: key `syn-library-filter`, default `'all'` — read on mount, write on change.
4. **`LibraryViewToggle`** localStorage persist: key `syn-library-view`, default `'grid'` — read on mount.
5. **Generating state block**: `isGenerating && pointer-events: none` + disabled action buttons + Loader2 spinner αντί icon.
6. **`LibraryEmptyState`** illustration: SVG upload arrow σε κύκλο (brand color) + "Πρόσθεσε PDF ή επικόλλησε κείμενο" + `<Button onClick={openUploadModal}>`.
7. **Card alert overlays**: absolute-positioned top-right corner chips (gap amber ⚠, contradiction violet ●) — overlay στη card, δεν ξεχωριστό alert section.

---

### 2.3 Tasks (`Tasks.tsx`)

**Mockup χαρακτηριστικά (Warm Sand palette):**

- Page header: "Εργασίες" H1 + streak flame badge + subtitle με date + exam countdown.
- Daily Progress bar: "4 από 12 εργασίες ολοκληρώθηκαν" + total/remaining minutes + % + progress bar.
- Active Session Banner (slate): τρέχουσα εργασία + επόμενη + auto-advance hint.
- **Session Type Selector:** 5 κάρτες σε `grid 5-columns`:
  - Γρήγορο Sprint ⚡ ~15λ (`rec: true` → "ΠΡΟΤΕΙΝΕΤΑΙ" badge πάνω δεξιά)
  - Focused 🎯 ~25λ
  - Deep 📖 ~50λ
  - Exam Cram 📋 ~30λ
  - Διαστηματική 🔄 ~20λ
- Tabs με count badges: "Σημερινό πλάνο (3)" / "Αδύναμα σημεία (2)" / "Due επαναλήψεις (2)" / "Επανάληψη λαθών (1)".
- **Today's Plan tab:**
  - Exam countdown banner (rose).
  - "Σχεδόν εκεί" + "Υπενθύμιση ανάκλησης" 2-column mini cards.
  - Task cards: status icon (running → "ΤΡΕΧΕΙ" badge / pending → Circle), task icon (32×32), title, course chip, duration, priority badge (critical = rose border + "ΥΨΗΛΗ ΠΡΟΤΕΡΑΙΟΤΗΤΑ"), "Έναρξη/Συνέχεια" button. Expandable → description + FSRS rating buttons (review type).
- **Weak Areas tab:** concept + course + errors count + mastery bar + trend icon (TrendingUp emerald / ArrowDownRight rose) + "Μελέτη τώρα" + "Ρώτα AI" buttons.
- **Due Reviews tab:** spaced review banner + concept + course + due date + interval badge + "Έναρξη" button.
- **Mistakes tab:** amber banner + mistake cards (wrong → rose, correct → emerald) + "Βαθιά εξήγηση" + "Παρόμοια εξάσκηση".

**Production gaps:**

| Gap | Περιγραφή |
|---|---|
| Session type cards layout | Production: `grid 2→3→5 cols` ✓ — αλλά δεν έχει τον "ΠΡΟΤΕΙΝΕΤΑΙ" badge |
| "ΣΥΝΙΣΤΩΜΕΝΟ/ΠΡΟΤΕΙΝΕΤΑΙ" badge | Δεν υπάρχει — χρειάζεται `pedagogy.getRecommendedSessionType(stats)` |
| Tab count live updates | Counts υπολογίζονται ✓ αλλά δεν ενημερώνονται real-time χωρίς re-render |
| Task card priority styling | `priority === 'critical'` → `border-accent-rose/30` ✓ αλλά **χωρίς** left-border accent του mockup |
| Warm Sand theme scope | Tasks δεν switch-άρει σε warm-sand tokens — χρειάζεται `data-theme="warm-sand"` attribute |
| "Δημιούργησε Πλάνο" CTA | Δεν υπάρχει — mockup δείχνει full-width brand button κάτω από session selector |
| "Σχεδόν εκεί" mini cards | Δεν υπάρχουν — 2-column info cards πάνω από task list |

**Βήματα υλοποίησης:**

1. **`SessionTypeSelector` refactor:** Πρόσθεσε `rec` prop ανά session type → "ΠΡΟΤΕΙΝΕΤΑΙ" badge (`pedagogy.getRecommendedSessionType(stats)` → returns session type id). File: `src/lib/tasksContent.ts` + component update.
2. **`TaskCard` priority left-border:** `priority === 'critical'` → `border-l-2 border-l-accent-rose` class (Tailwind) + `'ΚΡΙΣΙΜΟ'` label badge.
3. **Tasks page Warm Sand scope:** Πρόσθεσε `data-theme="warm-sand"` attribute στο root `<div className="max-w-5xl ...">` — CSS selector `[data-theme="warm-sand"]` selects warm palette tokens.
4. **`GeneratePlanButton`:** Full-width brand button, calls `POST /api/tasks/generate-daily-plan` με `{ sessionType, date }` → refreshes task list. Εμφανίζεται κάτω από session selector.
5. **`AlmostTherePanel`:** 2-column info card "Σχεδόν εκεί" + "Υπενθύμιση ανάκλησης" — computed από tasks με `mastery > 55 && mastery < 75`.
6. **`WeakConceptRow`:** Mastery bar + trend icon (TrendingUp emerald / ArrowDownRight rose) — verify existing implementation matches mockup colors.
7. **`DueReviewRow`:** Interval badge (slate chip `{interval}d`) + "Ξεκίνα Επανάληψη" button — verify.

---

### 2.4 Analytics (`Analytics.tsx`)

**Mockup χαρακτηριστικά:**

Το Analytics mockup έχει **4 tabs**: Overview / Mastery / Behavior / Insights.

**Overview tab:**
- KPI tiles (4): Συνολικό mastery %, Έννοιες mastered (X/136), Exam readiness %, Χρόνος μελέτης.
- Knowledge Flow collapsible: Sankey diagram, Waterfall stages, Treemap, Timeline.
- Calibration summary chip.
- Exam Readiness donut ring + Forgetting Curve line chart.
- FSRS-4 prediction panel: mini stats + sparkline.
- Weekly trend bar chart + 90-day activity heatmap.
- Confidence calibration bar chart (buckets).
- Courses mastery bars + Concepts mastery bars + Calibration (You vs Real) dual bars.
- Visual Lab collapsible (raw Sankey data + FSRS forecast).

**Mastery tab:**
- Concept Graph placeholder (interactive network, mock).
- Mastery Heatmap (concept × days grid).
- Δυνατά / Αδύναμα / Σχεδόν κατανοητά 3-column panels.
- Active Misconceptions 2-column cards.

**Behavior tab:**
- Learning Radar (pentagon SVG).
- Model Variables table (recall performance, transfer, best study time, etc.).
- Error Patterns bar chart (Υπολογιστικά / Εννοιολογικά / Διαδικαστικά).
- 4 KPI mini panels: Μέση Συνεδρία / Ζήτηση Βοήθειας / Επιμονή / Αυτοπεποίθηση.

**Insights tab:**
- 3-column strength/warning/tip cards.
- AI-generated observations bullets.
- Recommended action cards (with CTA → openStudyWorkspaceForConcept).

**Global:** Date range filter (7ημ / 30ημ / Εξάμηνο) — affects all charts.

**Production gaps:**

| Gap | Περιγραφή |
|---|---|
| Mastery Map tile grid | Production έχει `MasteryHeatmap` αλλά **όχι** subject-level tile grid με mastery % + trend |
| 7-day bar chart | `StudyTimeline` υπάρχει αλλά η 7-day bar + session type donut λείπουν |
| AI Insights tab | Δεν υπάρχει ως αυτόνομο component — insights εμφανίζονται μέσω Agent chat |
| Date range global filter | Δεν υπάρχει context provider που να επηρεάζει όλα τα charts ταυτόχρονα |
| Drill-down on subject tile | Click σε subject tile → concept list δεν υλοποιείται |
| Visual Lab | Δεν υπάρχει raw data debug panel |

**Βήματα υλοποίησης:**

1. **`SubjectMasteryGrid`** component: tile για κάθε course από store — mastery %, pending concepts count, trend arrow (TrendingUp/Down). File: `src/components/analytics/SubjectMasteryGrid.tsx`.
2. **`StudyBehaviorCharts`:** 7-day bar chart (Recharts `BarChart`), session effectiveness line chart, session type donut (`PieChart`). File: `src/components/analytics/StudyBehaviorCharts.tsx`.
3. **`AIInsightsPanel`:** Calls `GET /api/analytics/insights` → renders bullet observations + action cards (CTA → `openStudyWorkspaceForConcept` / `navigateToTask`). File: `src/components/analytics/AIInsightsPanel.tsx`.
4. **`AnalyticsDateRangeFilter`:** React context provider με `{ range: '7d' | '30d' | 'semester' }` — consumed by all chart components. File: `src/components/analytics/AnalyticsDateRangeContext.tsx`.
5. **`SubjectDrillDown`** modal/panel: ανοίγει από tile click → concept list με mastery bars + "Μελέτη" CTA. File: `src/components/analytics/SubjectDrillDown.tsx`.
6. **Analytics tabs integration:** Ενοποίηση Overview / Mastery / Behavior / Insights tabs — currently production Analytics έχει διαφορετικό tab structure.

---

## Κεφάλαιο 3 — Κοινά Components που Εξυπηρετούν Όλες τις Οθόνες

| Component | Mockup παρουσία | Status στο production | Action |
|---|---|---|---|
| `SectionLabel` (icon + uppercase label + optional action link) | Παντού (Dashboard, Library, Tasks, Analytics) | Ορίζεται **locally** σε κάθε mockup, **δεν υπάρχει** ως shared component στο production | Δημιουργία `src/components/ui/SectionLabel.tsx` |
| `ProgressBar` (height 4px, rounded, `pct` + `color` props) | Παντού | Υπάρχει `ui/progress.tsx` αλλά διαφορετικό API | Refactor ώστε να δέχεται `pct` + `color` prop |
| `Badge` / `Chip` (status chip με variant) | Library + Tasks | Υπάρχει αλλά δεν έχει variant για processing status | Προσθήκη `variant: 'status' | 'quality' | 'priority'` |
| `Card` (surface/border/radius 8) | Παντού | Υπάρχει ως `ui/card.tsx` | Verify `padding=12` default ή prop |
| `AnimatedAccordion` | Settings (Task #5) | PROPOSED Task #5 | Depends on Task #5 |
| `CourseStatusBadge` | Library course cards | Δεν υπάρχει | Νέο component (βλ. 2.2 βήμα 1) |
| `QualityScoreBadge` | Library course cards | Δεν υπάρχει | Νέο component (βλ. 2.2 βήμα 2) |

---

## Κεφάλαιο 4 — Design Token Alignment (CSS)

```css
/* Mockup tokens → CSS variables (index.css / theme presets) */

/* Surfaces */
--syn-bg           → background surface (page background)
--syn-surface      → card / panel background
--syn-surface-2    → secondary surface / hover states

/* Borders */
--syn-border       → 1px card borders (subtle)
--syn-border-2     → stronger separators

/* Text */
--syn-text         → primary text
--syn-text-2       → secondary text
--syn-text-3       → muted / icon color

/* Brand (primary action) */
--syn-brand        → primary action color
--syn-brand-dark   → hover state
--syn-brand-light  → selected / tinted bg

/* Semantic colors */
--syn-emerald      → success / high mastery
--syn-emerald-bg   → success tinted bg
--syn-amber        → warning / medium mastery
--syn-amber-bg     → warning tinted bg
--syn-rose         → error / critical / low mastery
--syn-rose-bg      → error tinted bg
--syn-slate        → info / neutral stats
--syn-slate-bg     → info tinted bg
--syn-violet       → AI / premium accent
--syn-violet-bg    → AI tinted bg
```

**Warm Sand theme override** (scoped στο Tasks page):

```css
[data-theme="warm-sand"] {
  --syn-bg:          #F6F1EA;
  --syn-surface:     #FDFAF6;
  --syn-surface-2:   #F0EBE2;
  --syn-border:      #E0D8CC;
  --syn-brand:       #7D6245;
  --syn-brand-dark:  #5C4832;
  --syn-brand-light: #EDE5D8;
  /* Semantic colors remain unchanged */
}
```

---

## Κεφάλαιο 5 — Σειρά Προτεραιότητας Υλοποίησης (Waves)

| Wave | Scope | Λόγος |
|---|---|---|
| **Wave A** | Shared primitives: `SectionLabel`, `ProgressBar` refactor, `Badge` status/quality/priority variants, `CourseStatusBadge`, `QualityScoreBadge` | Unblock όλα τα screen components — μηδενικές εξαρτήσεις |
| **Wave B** | Dashboard: `DashboardFocusCard`, `DailyFocusSection`, `WeakAreaChip` clickable, `PostUploadCTA`, stats row verify | Πρώτη εντύπωση χρήστη — πιο ορατή σελίδα |
| **Wave C** | Library: `QualityScoreBadge` on card, alert overlays on card corner, filter/view localStorage persist, empty state illustration, generating state block | Retention loop (upload → course) |
| **Wave D** | Tasks: `SessionTypeSelector` "ΠΡΟΤΕΙΝΕΤΑΙ" badge, warm-sand theme scope, `GeneratePlanButton`, `AlmostTherePanel`, priority left-border | Μαθησιακή ροή — daily usage |
| **Wave E** | Analytics: `SubjectMasteryGrid`, `StudyBehaviorCharts`, `AIInsightsPanel`, `AnalyticsDateRangeFilter`, `SubjectDrillDown` | Data-driven learning loop |
| **Wave F** | Polish: `aria-busy` audit, `reduced-motion` support, WCAG AA contrast audit, Greek copy pass, axe-core scan | Launch readiness |

---

## Κεφάλαιο 6 — Acceptance Criteria ανά Wave

### Wave A — Shared Primitives

- Unit tests για `SectionLabel`: renders icon + label + optional action, no snapshots.
- Unit tests για `ProgressBar`: renders με `pct=0`, `pct=50`, `pct=100` + custom color.
- Unit tests για `Badge`/`Chip`: renders κάθε variant (status, quality, priority).

### Wave B — Dashboard

- Dashboard E2E (Playwright): νέος χρήστης βλέπει greeting + stats row + Upload CTA σε <3s cold start.
- Unit test: `DashboardFocusCard` renders task title, course, duration, mastery bar.
- Unit test: `WeakAreaChip` calls `onFocusWeakArea` με το σωστό concept string on click.

### Wave C — Library

- Library E2E: ανεβάζει PDF → κάρτα εμφανίζεται με spinner + disabled actions → μετατρέπεται σε course card με quality badge.
- Unit test: `QualityScoreBadge` — score < 50 → amber label, score ≥ 75 → emerald label.
- Unit test: filter persist — mount, αλλαγή filter, unmount, re-mount → filter διατηρείται.

### Wave D — Tasks

- Unit tests: session type selection updates `sessionMode` state.
- Unit test: `GeneratePlanButton` calls API endpoint με `{ sessionType, date }`.
- Unit test: task card με `priority === 'critical'` έχει rose border class.

### Wave E — Analytics

- Unit tests: `AnalyticsDateRangeFilter` context — children λαμβάνουν σωστό `range` value.
- Unit test: `SubjectMasteryGrid` renders tile για κάθε course με mastery %.
- Integration test: date range change → charts re-fetch με updated query params.

### Wave F — Polish

- axe-core scan: **zero critical violations** σε Dashboard, Library, Tasks, Analytics.
- Playwright: reduced-motion simulation — animated elements δεν παίζουν animation.
- Manual WCAG AA check: all accent text on colored backgrounds passes 4.5:1 ratio.

---

## Παράρτημα — Αρχεία Αναφοράς

### Mockup αρχεία (visual target)

```
artifacts/mockup-sandbox/src/components/mockups/synapse-ux/
  Dashboard.tsx
  Library.tsx
  Tasks.tsx
  Analytics.tsx
  _group.css          ← Design tokens (Warm Sand defaults)
```

### Production αρχεία (implementation target)

```
artifacts/synapse-learning/src/
  components/
    Dashboard.tsx
    Library.tsx
    Tasks.tsx
    analytics/          ← Analytics page components
    ui/                 ← Shared primitives (Wave A targets)
      SectionLabel.tsx  ← ΔΗΜΙΟΥΡΓΙΑ
      CourseStatusBadge.tsx  ← ΔΗΜΙΟΥΡΓΙΑ
      QualityScoreBadge.tsx  ← ΔΗΜΙΟΥΡΓΙΑ
  lib/
    pedagogy.ts         ← getRecommendedSessionType()
    greeting.ts         ← greetingForTime() ✓ υπάρχει
    tasksContent.ts     ← session types + content
    i18n.ts             ← Greek/English string keys
  store/
    useStore.ts         ← Global app state
```

### Άλλα σχετικά docs

```
artifacts/synapse-learning/docs/
  PLATFORM_UI_UX_MASTER_PLAN.md     ← Ευρύτερο UX plan
  SYNAPTIC_FULL_SCALE_MASTER_PLAN_V2.md
  PAGE_BY_PAGE_OPTIMIZATION_MASTER_PLAN.md
```

---

*Τελευταία ενημέρωση: 2026-07-15 — Task #22 (feat/mockup-implementation branch)*
