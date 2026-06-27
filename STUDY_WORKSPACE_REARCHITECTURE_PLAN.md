# Study Workspace Re-Architecture Plan

> Exhaustive plan to eliminate the freeze on **Continue → Study Workspace**, and to
> de-overload the workspace UI/UX (web + tablet + mobile) without removing a
> single existing capability. Companion roadmap for the staged redesign of the
> remaining pages (Dashboard, Library, Tasks, Agent, Analytics, Teacher,
> Settings, Lesson).

---

## 0. Context & Diagnosis

### Symptoms reported
- Continue/Study-Workspace freeze: clicking *Continue* on a course or *Study
  Workspace* on the dashboard locks the whole UI for several seconds; nothing
  is interactable, no spinner, no skeleton.
- Workspace UI/UX feels like a *scientific repository / instrument*: too many
  visible strips, chips, banners and toolbars at once; everything competes for
  attention.

### Root cause (freeze)
The retry/preload layer is already correct:
- `preloadCriticalChunks` fires at boot.
- `loadStudyWorkspaceModule` retries 3× with `reloadOnStaleChunk: true`.

The actual blocker is **synchronous mount cost** of `StudyWorkspace.tsx`:
- ~2.756 lines, ~470 KB pre-gzip.
- ~30+ direct child panels imported eagerly inside the file.
- Several heavy helpers run during the initial render: BM25 excerpt,
  documentStructure, conceptMap PMI co-occurrence, source-intelligence scoring,
  step-rail builder, focus-bus subscription, correlation bus, command-palette
  index, keyboard-shortcut binder, mobile/desktop media listeners.
- Initial paint blocks on these even when the user only wants to see one tool.

### Root cause (visual overload)
- 5+ horizontal strips stacked vertically (`WorkspaceSourceStatusBar`,
  `WorkspaceContextStrip`, `SourceIntelligenceCard`, `WeakAreasFocusRail`,
  `WorkspaceLearningActionBar`, `ConceptBusPanel`, `WorkspaceDiscoverabilityPanel`,
  `WorkspaceToolHeader`, `WorkspaceToolCrossLinkBar`, etc.).
- Every tool ships its own header → duplicate guidance.
- Desktop dock + mobile drawer + tool strip + FAB overlap responsibilities.

---

## 1. Goals & Non-Goals

### Goals
1. **Time-to-interactive ≤ 400 ms** on a warm cache, ≤ 1.2 s cold, on a mid-tier
   laptop and on a 4× CPU-throttled mobile profile.
2. **Zero feature regressions.** Every panel, shortcut, persistence key,
   focus-bus event, correlation field, and S20 capability listed in
   `STUDY_WORKSPACE.md` keeps working bit-for-bit.
3. **One primary surface per breakpoint** — the screen never shows more than
   *one* contextual strip + *one* tool at once. Everything else lives behind a
   single, discoverable disclosure.
4. **Consistent design language** across Dashboard / Library / Tasks / Agent /
   Analytics / Teacher / Settings / Lesson — same spacing scale, same icon
   weight, same surface hierarchy.

### Non-Goals
- No backend / API changes.
- No change to algorithm outputs (`sourceIntelligence`, `buildQuizFromNotes`,
  etc.). Only *when* and *how* they render.
- No removal of any keyboard shortcut or persistence key.

---

## 2. Architecture Shift

### 2.1 From "one mega component" to "Shell + Panels"

```text
StudyWorkspace (shell, < 300 lines)
├── <WorkspaceProvider>          // single context, no prop-drilling
│   ├── focusBus, correlationBus, sourceIntelligence (lazy-computed)
│   └── persistence façade (workspace:${taskId})
├── <WorkspaceShell>             // chrome only: header, step-rail, footer
│   ├── <WorkspaceHeader/>       // breadcrumb + lang + layout switch
│   ├── <StepRail/>              // virtualised, no per-step computation
│   └── <Outlet/>                // tool surface, code-split per tool
└── <Suspense> per panel         // every tool is React.lazy()
```

All tools become **route-like leaves** with their own chunk:
`workspace/tools/<tool>/index.tsx` — split via `React.lazy()` and registered in
a single `workspaceToolRegistry.lazy.ts` map.

### 2.2 Idle-mount for non-critical surfaces

Use `requestIdleCallback` (with a `setTimeout(0)` fallback for Safari) to mount:
- `WorkspaceDiscoverabilityPanel`
- `WeakAreasFocusRail`
- `ConceptBusPanel`
- Command palette index
- Sentry breadcrumbs for chunk-load events

Initial paint mounts only: `WorkspaceHeader`, `StepRail`, active tool.

### 2.3 Compute-once, memoised, off the critical path

| Computation              | Before                       | After                                        |
| ------------------------ | ---------------------------- | -------------------------------------------- |
| BM25 excerpt             | sync in render               | `useDeferredValue` + `useMemo`, worker-ready |
| documentStructure        | sync in render               | idle-callback, cached per `(sourceId, lang)` |
| conceptMap PMI           | sync per render              | web-worker (`workspace.worker.ts`)           |
| sourceIntelligence score | sync                         | worker-derived, streamed to UI               |
| step-rail builder        | sync                         | `useMemo` keyed on `sourceId + lang`         |

A new `src/workers/workspace.worker.ts` exposes:
`{ buildExcerpt, detectStructure, buildConceptMap, scoreSource }`.
Falls back to main thread if `Worker` is unavailable (SSR, old Safari).

### 2.4 Layout — one strip, not seven

Replace the stack of 7+ strips with a single **`WorkspaceContextBar`** that
slots three rotating chips:
1. *Source quality* (1 chip — colour codes weak/moderate/strong, click → details popover).
2. *Focus / next-action* (1 chip — derived from `workspaceCorrelation`).
3. *Concept ribbon* (scrollable inline list).

Everything else (Discoverability, Weak Areas, ConceptBus, Source Intelligence,
SignalBars, Cross-Link Bar) becomes a **single `ⓘ` disclosure** at the right of
the context bar — opens a side-sheet on desktop, a bottom-sheet on mobile.
This preserves **100 %** of the information, but only when the user asks.

### 2.5 Tool surface

Each tool keeps its current logic but is wrapped in a uniform `<ToolFrame>`:

```tsx
<ToolFrame
  toolId="reader"
  title={…}             // editorial serif, calm
  purpose={…}           // one line, italic
  onAskAgent={…}        // optional CTA in the frame footer
  onJumpTool={…}
>
  <ReaderPanel />
</ToolFrame>
```

`<ToolFrame>` is the *only* place that renders tool chrome — `WorkspaceToolHeader`
and `WorkspaceToolCrossLinkBar` collapse into it. Saves vertical space and gives
every tool an identical mental model.

### 2.6 Mobile / tablet

- **Mobile (< 768 px):** single-pane, bottom-sheet for tool picker (existing
  `WorkspaceMobileToolDrawer`), `WorkspaceContextBar` becomes a sticky 36 px
  pill row, step-rail collapses to `‹ Step 3 / 7 ›`.
- **Tablet (768–1023 px):** focus-tool by default, step-rail as a left rail
  (icons only), context bar inline.
- **Desktop (≥ 1024 px):** split layout opt-in, never default. Default opens in
  *focus-lesson* mode on first visit, remembers the last layout per task.

---

## 3. Implementation Phases

> Each phase ships independently; the app stays green between phases.

### Phase A — Performance unlock (1–2 days)
1. Extract every tool into `workspace/tools/<id>/index.tsx`; register lazy.
2. Wrap each in `React.Suspense` with a 64 px skeleton.
3. Move `documentStructure` + `sourceIntelligence` to a worker (with a sync
   fallback). Cache by `(sourceId, lang)`.
4. Idle-mount Discoverability / WeakAreas / ConceptBus / CommandPalette index.
5. Add `useDeferredValue` for `concept`, `focusTerm`, and `stepIndex`.

**Acceptance:** Lighthouse TBT < 200 ms on mid-tier. Playwright: Continue →
first interactive tile under 1.2 s cold, 400 ms warm. No console warnings.

### Phase B — Visual compression (1–2 days)
6. Build `WorkspaceContextBar` (3-chip + ⓘ side-sheet).
7. Merge `WorkspaceToolHeader` + `WorkspaceToolCrossLinkBar` into `<ToolFrame>`.
8. Hide legacy strips behind the ⓘ side-sheet — *no deletes*, only relocations.
9. Replace remaining Lucide icons in workspace panels with Phosphor (thin)
   via the existing `lucide-shim`. Audit for stray hard-coded weights.

**Acceptance:** Vertical chrome above the tool body ≤ 96 px desktop, ≤ 72 px
mobile. Every previously-visible affordance is reachable in ≤ 2 taps.

### Phase C — Cross-page sweep (2–3 days)
10. Apply the same `ContextBar + ToolFrame` pattern to:
    - Dashboard (KPI bar + bento tiles)
    - Library (filter bar + grid)
    - Tasks (today-bar + queue)
    - Agent (mode chip + transcript)
    - Analytics (tab bar + panels)
    - Teacher (status bar + cohort panels)
    - Settings (group bar + section cards)
    - Lesson (step rail + body)
11. Centralise spacing/radius/shadow tokens in `index.css` under the existing
    `[data-ws-theme="warm"]` scope.

**Acceptance:** Visual diff regression test (Playwright + percy-style snapshot
in CI) shows intentional changes only. axe-core: 0 new violations.

### Phase D — Hardening (1 day)
12. E2E flow: Continue → tool switch → ⓘ side-sheet → step nav → command
    palette → mobile drawer. Asserts no full reload, no chunk error, no
    duplicate header.
13. Sentry: tag every workspace transaction with `tool`, `layout`, `breakpoint`.
14. Doc updates: `STUDY_WORKSPACE.md`, `ARCHITECTURE.md`, `CHANGELOG.md`.

---

## 4. Risks & Mitigations

| Risk                                                  | Mitigation                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| Lazy chunks fail on flaky networks                    | Existing `lazyWithRetry` + one-shot reload banner already shipped.    |
| Worker unsupported (old Safari, embedded webviews)    | Sync fallback path, feature-detected at module load.                  |
| Hidden-by-default panels = users can’t find features  | Onboarding spotlight on first visit; ⓘ chip pulses once per session.  |
| Per-tool chunk = waterfall on slow links              | Preload top-3 tools on idle after first paint (focus-bus stats).      |
| Test debt across 100+ features                        | Phase A ships behind a `?ws=v2` query flag for 1 week before default. |

---

## 5. Success Metrics

- **TTI:** Continue → interactive ≤ 1.2 s cold / ≤ 400 ms warm.
- **CLS:** < 0.02 in the first 3 s.
- **Above-the-fold chrome:** ≤ 96 px desktop, ≤ 72 px mobile.
- **Sentry `synapse:chunk-error` rate:** unchanged or lower.
- **Feature parity matrix:** 100 % of rows in `STUDY_WORKSPACE.md §Tools` and
  §`Shipped upgrades` pass automated smoke tests.

---

## 6. Out-of-Scope (tracked elsewhere)

- BullMQ, pgvector, LTI — `WORKSPACE_UPGRADE_PLAN.md`.
- Resizable split + pop-out tools — `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md §5`.
- Content-quality dashboard — same blueprint.

---

_Last updated: 2026-06-27 — owner: Lovable agent._
