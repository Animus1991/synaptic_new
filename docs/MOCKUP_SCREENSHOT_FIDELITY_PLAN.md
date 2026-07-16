# Mockup screenshot fidelity plan (Replit canvas → production)

**Date:** 2026-07-16  
**Inputs:** 10 Replit canvas screenshots (Dashboard×2, Tasks×2, Library×2, Analytics×4)  
**Target branch:** `feat/mockup-implementation` → `Animus1991/synaptic_new` only  
**Non-negotiables:** keep 100% tool functionality · denser type than Replit · **no emojis** · Phosphor/line icons · warm light + dark first-class · no secrets/PII in commits

**Canonical companions:** [`MOCKUP_MERGE_AUDIT_AND_PLAN.md`](./MOCKUP_MERGE_AUDIT_AND_PLAN.md), [`MOCKUP_IMPLEMENTATION_PLAN.md`](./MOCKUP_IMPLEMENTATION_PLAN.md), [`GAP_AUDIT.md`](./GAP_AUDIT.md), `PRODUCT_SCALE_STATUS.md`

---

## 1. Method (objective)

| Step | Action |
| ---- | ------ |
| 1 | Inventory every visible chrome block in each screenshot |
| 2 | Map to production component / lib (or mark **GAP**) |
| 3 | Prefer production data wiring over mockup placeholders |
| 4 | Apply Replit clarity **without** Replit magnification |
| 5 | Ship Wave G (this sprint) for high-ROI fidelity; defer only explicit Wave H+ rows |

**Density contract (user):** H1 ≈ 18–20px · section labels 11–13px uppercase · cards `p-3`/`p-4` · KPI numerals `text-xl` not `text-3xl` · zero emoji chrome.

---

## 2. Cross-cutting merge (both worlds)

| Keep from production | Adopt from canvas |
| -------------------- | ----------------- |
| Full workspace tool surface + Concept Bus | Cream canvas `#FDFBF7` / warm-sand cards |
| Stacked hub (no side-panel overlap) | Semantic accent chips (tan/sage/rose/blue) |
| FSRS / pedagogy / i18n / tests | Compact stat strips, dual insight banners |
| Research analytics tab | Clear tab rhythm + thin-line icons |
| Dark theme parity | Soft borders, subtle elevation |

---

## 3. Per-surface inventory

### 3.1 Dashboard (shots 1–2)

| Canvas block | Production map | Status |
| ------------ | -------------- | ------ |
| Title + Study Space / Start Session | `DashboardActionHub` CTAs | **shipped** (Wave B) |
| Post-upload banner | `PostUploadBanner` | **shipped** |
| Greeting + streak subtitle | `greetingForTime` + Phosphor sun/moon | **shipped** (no emoji) |
| 5 compact stats | `StatCard` row | **shipped** |
| Active focus / Continue | workspace resume + next action | **shipped** |
| Quick-action tabs | hub quick links | **shipped** |
| 2×2 alert grid (exam/quiz/forget/misconception) | dashboard alerts + smart CTAs | **shipped** |
| Exam countdown + anti-passive | callouts | **shipped** |
| Recommendation Execute | `dashboardNextAction` | **shipped** |
| Readiness + performance bars + syllabus | right rail / learner model | **shipped** |
| Warm cream density | light → warm-sand scope | **Wave G** |
| Compact greeting type | `text-lg` hub title | **Wave G** |

### 3.2 Tasks (shots 3–4)

| Canvas block | Production map | Status |
| ------------ | -------------- | ------ |
| Progress card + daily % | `BlueprintSurface` progress | **shipped** |
| Active session strip | `tasks-session-status` | **shipped** |
| 5 session types + recommended | `SessionLauncherCard` + `getRecommendedSessionType` | **shipped** |
| Tab counts | `DescriptiveStickyTabBar` | **shipped** |
| Exam countdown callout | `UxCallout` danger | **shipped** |
| Almost-there + recall reminder dual strip | Dashboard had almost-known; Tasks lacked dual strip | **Wave G** |
| Leitner rate row on expand | review rating buttons | **shipped** |
| Badge copy ΠΡΟΤΕΙΝΕΤΑΙ | `sessionRecommendedBadge` | **Wave G** (el) |
| Warm-sand page scope | already on Tasks | **shipped** |

### 3.3 Library (shots 5–6)

| Canvas block | Production map | Status |
| ------------ | -------------- | ------ |
| RAG sync banner | `RagIndexProgressBanner` | **shipped** |
| NotebookLM import | `NotebookLmImportPanel` | **shipped** |
| Filter pills + search + grid/list | Library filters + localStorage | **shipped** (Wave C) |
| Quality / status / gap badges | `QualityScoreBadge`, `CourseStatusBadge` | **shipped** |
| Dense course cards + Open/Shell | card actions | **shipped** |
| Topic / prereq / enrichment chips | course metadata | **shipped** |
| Warm-sand scope + softer cream | page scope | **Wave G** |

### 3.4 Analytics (shots 7–10)

| Canvas block | Production map | Status |
| ------------ | -------------- | ------ |
| Tabs Overview / Mastery / Behavior / Insights / Research | `TabBar` | **shipped** (Wave E) |
| KPI row (mastery, concepts, readiness, time) | `ProgressKpiRow` | denser **Wave G** |
| Exam readiness ring + retention curve | `ReadinessRing`, `RetentionCurve` | **shipped** |
| FSRS-4 forecast strip | `analytics-fsrs-forecast` | **shipped** |
| Weekly trend + 90-day heatmap | behavior charts | **shipped** (Wave E) |
| Confidence bins + You vs Real | `ConfidenceBucketChart`, calibration | **shipped** |
| Courses / Concepts lists | mastery tab + drill-down | **shipped** |
| Date range filter | `AnalyticsDateRangeFilter` | **shipped** |
| Warm-sand + dense KPI | page scope + `text-xl` | **Wave G** |

---

## 4. Theme upgrade plan (all themes, warm+dark reference)

| Theme | Action |
| ----- | ------ |
| **light** | Align canvas cream (`#fdfbf7` / warm-sand surfaces); softer borders |
| **warm-sand** | Keep as scoped denser cream for platform pages under light |
| **dark** | Preserve contrast; keep brand fills; no emoji |
| **spectrum** | Treat as light-family for warm-sand page scope |
| **blueprint** | Keep distinctive dark canvas; inherit density tokens from `.app-shell` |

---

## 5. Wave G — this sprint (implementation checklist)

| ID | Item | Done when |
| -- | ---- | --------- |
| G-01 | Exhaustive screenshot fidelity plan (this file) | written |
| G-02 | Wave 5 docs SoT: ARCHITECTURE / BLUEPRINT / PRODUCT_SCALE_PLAN / GAP | reconciled |
| G-03 | Light theme cream ↔ mockup; density tokens tightened | CSS |
| G-04 | Warm-sand page scope on Dashboard / Library / Analytics | components |
| G-05 | Compact hub + Analytics KPI type | components |
| G-06 | Tasks dual insight banners + el recommended badge | Tasks + i18n + App wire |
| G-07 | Secret scan; push only `synaptic_new` `feat/mockup-implementation` | git |

---

## 6. Wave H+ (shipped 2026-07-16)

| ID | Item | Status |
| -- | ---- | ------ |
| H-01 | Optional Dashboard 3-column “canvas preview” layout toggle | **shipped** |
| H-02 | Library “combined study” purple promo strip redesign | **shipped** |
| H-03 | Analytics Visual Lab expand preference | **shipped** |
| H-04 | TOOL-RD-03 historical Greek reprocess path | **shipped** |
| H-05 | AI-05 NotebookLM parity flag default strategy | **shipped** |

## 6b. Wave I (screenshot IA fidelity — 2026-07-16)

See [`MOCKUP_WAVE_I_FIDELITY_PLAN.md`](./MOCKUP_WAVE_I_FIDELITY_PLAN.md). Sprint I-1 shipped (alert grid, rail IA, Tasks session order, Library Open+Shell, Analytics 3-col). I-2/I-3 tracked without omission.

## 6c. Wave J + K

- Wave J: [`MOCKUP_WAVE_J_FIDELITY_PLAN.md`](./MOCKUP_WAVE_J_FIDELITY_PLAN.md) (J-1 + J-2 shipped).
- Wave K: [`MOCKUP_WAVE_K_FIDELITY_PLAN.md`](./MOCKUP_WAVE_K_FIDELITY_PLAN.md) — spectrum/blueprint parity; warm-sand no longer overrides spectrum; horizontal calibration bins.

## 6d. Wave L

- [`MOCKUP_WAVE_L_FIDELITY_PLAN.md`](./MOCKUP_WAVE_L_FIDELITY_PLAN.md) — L-1: Analytics flow banner, Library banner order, Tasks tab filter, Settings theme icons, denser Dashboard/CourseView. L-2: retrieval bar, FSRS expand polish, Visual Lab sticky footer, Agent embedded density.

## 6e. Wave M

- [`MOCKUP_WAVE_M_FIDELITY_PLAN.md`](./MOCKUP_WAVE_M_FIDELITY_PLAN.md) — M-1: density closeout on Onboarding/Student/Teacher/ExamPrep/Grounded/Reprocess, unicode `✓`/`✗` → Phosphor Check/X, theme SoT aliases (`--color-surface-canvas`, `--color-hairline`) across warm-light/warm-sand/dark/spectrum/blueprint, `.ux-kpi-value` shared numeral utility. M-2: KPI migration (Dashboard / Analytics / CourseView / ExamPrep), Visual Lab `AnimatePresence` collapse polish, spectrum WCAG title audit, embedded Agent inline source picker.

## 6f. Wave N

- [`MOCKUP_WAVE_N_FIDELITY_PLAN.md`](./MOCKUP_WAVE_N_FIDELITY_PLAN.md) — N-1: state-of-the-art theme system audit — `--color-focus-ring` + `--color-surface-pressed` + `--color-on-brand / -danger / -warn / -success / -info` + `--elev-popover` explicit for all 5 themes, `.ux-focus-ring` shared utility, sepia `::selection` for warm-light/warm-sand, thin themed scrollbars for warm-light/warm-sand/spectrum, unicode `✕` on Agent source settings replaced with Phosphor `X`. N-2: `.ux-chip-solid-*` bound to `--color-on-*`, `.ux-elev-popover` utility applied to NotificationsPanel/CommandPalette (root + workspace)/DashboardActionHub, `--color-surface-hover-strong` + `.ux-hover-strong` (two-step hover applied to Agent embedded source menu), `--motion-duration-emphasized` (360 ms) + `--motion-ease-emphasized` (Material 3 emphasized decelerate) tokens applied to Analytics Visual Lab collapse and Agent embedded mode dropdown.

## 6g. Wave O

- [`MOCKUP_WAVE_O_FIDELITY_PLAN.md`](./MOCKUP_WAVE_O_FIDELITY_PLAN.md) — O-1: global `MotionConfig reducedMotion="user"` at `App.tsx` for automatic OS-level reduced-motion respect across all framer-motion subtrees; explicit emphasized transitions on Onboarding steps (welcome/role/goals/schedule), UploadModal backdrop + panel, AppToastBanner, OfflineShellBanner back-online toast. Preserves spring transitions on ConfirmDialog + DashboardHubShell overlay.

---

## 7. Security

- Never commit `.env`, live keys, Google client secrets, JWT secrets, user dumps.
- Only `*.env.example` with placeholders.
- Push target: **`https://github.com/Animus1991/synaptic_new.git`** branch **`feat/mockup-implementation`** only (not `origin/main` unless explicitly requested).

---

## 8. Acceptance

- [x] Dashboard / Tasks / Library / Analytics match canvas **structure** at denser scale
- [x] No emoji in primary chrome
- [x] Warm light + dark remain first-class
- [x] All workspace tools still launch and function
- [x] No secrets in the commit / push
- [x] Wave H+ H-01…H-05 closed without omission
