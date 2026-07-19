# Replit-inspired clarity plan (zero feature removal)

**Status:** active SSoT for post–OPT-R8 residual Replit *principles* under Synapse Minimal  
**Constraint:** restyle / reorganize / disclose only — **never remove** views, tools, enterprise, auth, i18n, or a11y  
**Brand rule:** Replit **product clarity** (workspace-first, thin chrome, prompt/create loop) — **not** Replit orange, Diatype, or marketing clone  
**Relation to other axes:**

| Axis | SSoT | What it owns |
|------|------|----------------|
| **Replit clarity (OPT-R*)** | This doc + shipped R1–R8 in `GAP_AUDIT.md` | Border-first rhythm, prompt-bar, canvas frames, empty/modal stacks |
| **Primer / GitHub (OPT-M*)** | `docs/PRIMER_GITHUB_ENHANCEMENT_PLAN.md` | Density, status bus, overflow, Minimal theme tokens |
| **ChatGPT-calm (OPT-C*)** | `docs/CHATGPT_MINIMAL_ENHANCEMENT_PLAN.md` | Conversation column, soft bubbles, quiet Agent/shell |

All three **coexist** under `minimal` / `minimal-dark`. Blueprint stays expressive / selectable. Tools keep instrument chrome.

Related: `docs/MOCKUP_WAVE_L_FIDELITY_PLAN.md`, `docs/MOCKUP_WAVE_M_FIDELITY_PLAN.md`, `src/styles/primer-minimal.css`, `src/styles/chatgpt-calm.css`

---

## 0. Executive verdict

| Question | Answer |
|----------|--------|
| Can Synapse feel Replit-clear without losing features? | **Yes** — same IA; thinner chrome, stronger content canvas, prompt-first create |
| Did prior agents already start this? | **Yes** — OPT-R1–R8 **shipped** (aesthetic-only); mockup Waves L/M used Replit screenshots |
| Is Minimal already “Replit”? | **No** — Minimal ≈ GitHub density + calm chat. Replit ≈ **workspace/create loop** + sparse chrome |
| Safest architecture? | New waves **OPT-R9+** Minimal-gated CSS/layout; no orange; no tool removal |
| Clone Replit brand? | **No** — principles only (see §9 non-borrows) |

### 0.1 Three-axis stack (do not conflate)

```
┌─────────────────────────────────────────────────────────┐
│  Blueprint (opt-in) — expressive Option-B identity      │
├─────────────────────────────────────────────────────────┤
│  Minimal / Minimal Dark (default)                       │
│   ├─ Primer (M*) — borders, density, status, overflow   │
│   ├─ Calm (C*)   — Agent/notebook conversation-first    │
│   └─ Replit (R*) — create/workspace canvas primacy      │
└─────────────────────────────────────────────────────────┘
```

**Honesty:** R1–R8 + M0–M19 + C0–C7 already moved Synapse far toward clarity. Remaining Replit leverage is **residual** (create loop, sources tree, workspace canvas, console-like status, quieter secondary hubs) — not a greenfield redesign.

---

## 1. What “Replit UI/UX” means here (principles → Synapse)

| Principle | Replit product cue | Synapse mapping | Non-negotiable |
|-----------|--------------------|-----------------|----------------|
| Workspace is the hero | Large editor/preview; chrome is thin | Study workspace Reader/notebook center | Keep Status, OCR, 13+ tools |
| Create / prompt loop | Prominent AI/prompt bar → instant artifact | Upload + Agent + pipeline generate | Keep filters, grounding, modes |
| File / source tree | Left list, sparse rows | Library list + notebook Sources | Keep upload, quality, delete |
| Output / console | Bottom or side log panel | Status bus + shell inbox | Keep alerts, conflicts, toast |
| One primary action | One CTA per viewport | PageHeader actions + PrimaryCTA | Keep secondary via overflow |
| Soft elevation | Hairline borders ≫ shadows | Already R1 / Primer | No shadow-heavy import |
| Sparse chrome | Labels short; mono for paths | Quiet nav (C3); mono eyebrows (R6) | Keep EL strings readable |
| Progressive panels | Collapse secondary | CollapsibleChromeSection (M2) | Keep all sections reachable |
| Instant feedback | Run → see | Pipeline progress + streaming Agent | Keep offline / LLM paths |
| Settings as utility | Left sections + content | Settings section nav | Keep all settings sections |

**Out of scope (do not port):** `#ff3c00` orange, ABC Diatype, 48–69px marketing displays, 40–60px radii, 100px pills, warm cream on Blueprint, infinite-canvas-as-home, Kanban-as-only-Tasks-backend, shadow-heavy material elevation, Replit logo/wordmark.

---

## 2. Baseline already shipped (prior agents)

### 2.1 OPT-R1–R8 (complete)

| Wave | Delivered |
|------|-----------|
| R1 | Calm/spark panels; border-over-shadow cards |
| R2 | Prompt-bar surfaces (upload/library); ghost pills |
| R3 | Tasks Kanban *visual* columns (list logic unchanged) |
| R4 | Agent flow rail; `ux-canvas-frame` previews |
| R5 | Canvas/tracking tokens |
| R6 | Landing intent chips + trust strip |
| R7 | Empty states + modal header stack |
| R8 | Nav accent bar; Visual Lab lane dividers |
| **R10** | Prompt-first UploadModal (`create-prompt`); paste/YouTube collapsible; quiet post-upload banner; `replit-clarity.css` |
| **R11** | Status console dock; inbox Errors/Activity; thin RAG pipeline strip; quieter toasts |
| **R13** | `workspace-canvas` / `notebook-canvas`; Files·AI·Tools hierarchy labels; denser Sources list; thinner panel chrome |
| **R18** | Atomic explore-demo seed; `e2e/helpers/captureSeed.ts` for M20/C8 workspace rows |

### 2.2 Primer + Calm (complete engineering)

M0–M19 + C0–C7 (+ C8 harness). Human Pass? still open for M20/C8 matrices.

### 2.3 Mockup fidelity lineage

Waves L/M explicitly compared to Replit canvas screenshots with constraint: **denser type than Replit**, no emoji chrome.

---

## 3. Non-negotiable inventory (must remain 100%)

Landing, Onboarding, Dashboard, Library, Course (4 tabs), Note Analysis, Tasks, Agent (**all modes**), Analytics, Teacher, Student Org, Settings · Workspace tools (reader, concept-map, scratchpad, whiteboard, leitner, feynman, quiz, simulator, compare, debate, timer, annotations, dashboard/intel) + discover/concept-bus/weak-areas · split/focus/zen · notebook 3-panel · agent/course splits · OCR/conflict/remap · CRDT · IRT · FSRS · roster/assignments/discussion/gradebook · LTI/SAML/passback · Auth/sync/billing/Google/plugins · EL/EN · WCAG AA · Blueprint selectable · demo content toggle.

---

## 4. Exhaustive surface audit → residual Replit gaps

Scoring: **Gap** = Replit clarity still weak after R+M+C. **Borrow** = principle only. **Risk** if mis-applied.

### 4.1 Product shell

| Surface | Current | Residual gap | Wave |
|---------|---------|--------------|------|
| Shell rail | Icon-collapsed rail + tooltips (**R9**) | — largely done | — |
| Mobile nav | Quiet under Minimal (C7) | — largely done | — |
| ⌘K / `?` | Path mono density (**R12**) | — largely done | — |
| Inbox/bell | Console Errors/Activity (**R11**) | — largely done | — |

### 4.2 Create / ingest (highest Replit ROI left)

| Surface | Current | Residual gap | Wave |
|---------|---------|--------------|------|
| Upload modal | Prompt-first + disclosed paste/YouTube (**R10**) | — largely done | — |
| Library empty | Content-first empties (M18) | Empty = single prompt/upload hero (filters still present when data exists) | R10 |
| Pipeline progress | Thin `pipeline-console-strip` (**R11**) | — | — |
| Post-upload banner | Quieter create strip (**R10**) | — | — |

### 4.3 Library / Sources

| Surface | Current | Residual gap | Wave |
|---------|---------|--------------|------|
| Course list | Tree density + list `library-course-card` (**R12**) | — largely done | — |
| Files tab | Path-style rows + quiet icons (**R12**) | — largely done | — |
| Notebook Sources | Denser list + Files label (**R13**) + mono labels (**R12**) | — largely done | — |

### 4.4 Study workspace (Replit’s core analogy)

| Surface | Current | Residual gap | Wave |
|---------|---------|--------------|------|
| Reader canvas | Content-first | Maximize canvas; chrome in overflow (partial M7) | R13 |
| Status bus | Bottom console dock + Errors/Activity (**R11**) | — | — |
| Tool dock | Overflow menus | Soft active tool; no icon wall return | R13 |
| Notebook 3-panel | Files · AI · Tools + canvas chrome (**R13**) | Zen discoverability polish | R13 residual / R17 |
| Split / Zen | Present | Zen more discoverable as “focus canvas” | R13 |

### 4.5 Agent / AI

| Surface | Current | Residual gap | Wave |
|---------|---------|--------------|------|
| Thread | Calm column (C1) | Done for chat | — |
| Modes | Grouped Dialogue/Exam/Subject/Support (**R14**) | — largely done | — |
| Flow rail | Collapsed by default under Minimal (**R14**) | — largely done | — |
| Citations | Present | Footnote density (already C1 intent) | polish |

### 4.6 Dashboard / Tasks / Analytics

| Surface | Current | Residual gap | Wave |
|---------|---------|--------------|------|
| Dashboard | Continue hero + quieter masonry (**R15**) | — largely done | — |
| Tasks | List/Board toggle + quieter sessions (**R15**) | — largely done | — |
| Analytics | Thinner chart/KPI chrome (**R15**) | — largely done | — |

### 4.7 Enterprise / Settings / Landing

| Surface | Current | Residual gap | Wave |
|---------|---------|--------------|------|
| Teacher / Org | Headers calmed (C6) | Tables stay dense (Primer); don’t Replit-marketing them | — |
| Settings | Theme story (C6) | Section nav + content more IDE-settings-like | R16 |
| Landing | Intent chips (R6); brand-first | Don’t Replit-clone marketing; keep Synapse brand | non-goal |
| Onboarding | Explore demo | Prompt-first first step optional; keep all paths | R10 |

### 4.8 Cross-cutting systems

| System | Residual gap | Wave |
|--------|--------------|------|
| Motion | Prefer opacity/height; no float | R17 |
| Focus rings | Present | Keep AA; quieter color under Minimal | R17 |
| Skeletons | Shimmer panels | Flatter, border-only | R17 |
| i18n EL | Comfortable density | Never shrink Greek for Replit airiness | constraint |
| A11y | Focus, labels | No color-only state | constraint |
| Capture QA | `ensureCaptureDemoCourse` + atomic explore-demo (**R18**) | — | — |

---

## 5. Functional opportunities (clarity ≠ feature deletion)

These improve **legibility of existing power**, not new product pillars:

1. **Create loop visibility** — same upload/generate; clearer primary path  
2. **Console metaphor for Status** — same events; Replit-like panel chrome  
3. **Sources as file tree** — same files; denser navigation  
4. **Workspace canvas primacy** — same tools; less chrome competition  
5. **Command palette paths** — same commands; mono/path formatting  
6. **Capture seeding** — same demo content; ensure e2e dumps include courses  

**Not in scope as “Replit features”:** multiplayer coding IDE, deployments billing UI, Replit Agent product, Teams marketing.

---

## 6. Wave plan OPT-R9+ (proposed)

| Wave | Scope | Done when | Risk |
|------|-------|-----------|------|
| **OPT-R9** | Optional collapsed shell rail (icons + tooltip; expand restores labels) | All `nav-*` retained; a11y OK | **shipped** |
| **OPT-R10** | Create/upload/onboarding prompt-first chrome (disclose advanced) | Upload + demo paths intact | **shipped** |
| **OPT-R11** | Status/inbox “console” panel chrome + pipeline strip | No alert loss | **shipped** |
| **OPT-R12** | Library/files + ⌘K path mono density | Filters/upload kept | **shipped** |
| **OPT-R13** | Workspace/notebook canvas primacy (Sources/Studio hierarchy copy+CSS) | 3-panel + tools 100% | **shipped** |
| **OPT-R14** | Agent tools/modes menu grouping (all modes still listed) | Modes 100% | **shipped** |
| **OPT-R15** | Dashboard/Tasks/Analytics secondary quieter | Hub features kept | **shipped** |
| **OPT-R16** | Settings IDE-like section layout polish | All sections kept | Low |
| **OPT-R17** | Motion/skeleton/focus Minimal polish | AA retained | Low |
| **OPT-R18** | Capture harness: seed demo course for M20/C8 workspace rows | Human Pass? fill-in reduced | **shipped** |

**Default gate:** Minimal / Minimal Dark only (match C* pattern). Blueprint untouched unless polish is theme-agnostic and harmless.

---

## 7. ROI ranking (residual Replit clarity)

| Rank | Change | Why | Wave |
|------|--------|-----|------|
| 1 | Workspace canvas primacy | Closest to Replit editor feel | R13 |
| 2 | Create/upload prompt-first | Replit’s “start making” loop | R10 |
| 3 | Status as console | Familiar power-user pattern | R11 |
| 4 | Sources/files tree density | File-first mental model | R12 |
| 5 | Dashboard single Continue hero | Less hub scream | R15 |
| 6 | Collapsed shell rail | More canvas width | R9 |
| 7 | Settings IDE layout | Utility clarity | R16 |
| 8 | Agent mode grouping | Less wall of modes | R14 |
| 9 | Motion/skeleton quiet | Finish frosting | R17 |
| 10 | Capture seed | Unblocks human QA | R18 |

---

## 8. Conflicts with Primer / Calm (resolve explicitly)

| Conflict | Resolution |
|----------|------------|
| Primer density vs Replit air | Prefer **density for tables/tools**; air for **canvas + chat** |
| Calm chat vs Replit create | Agent stays calm (C*); upload/library lean Replit create (R10) |
| Cards vs flat | Interactive tools may keep light cards; message/canvas stay flat |
| Kanban | Visual only (R3); never replace task engine |
| Collapsed nav | Must keep keyboard + mobile labels; tooltips required |

---

## 9. Non-goals

- Removing any mode, tool, enterprise surface, or NotebookLM panel  
- Importing Replit orange / Diatype / marketing display scale  
- Making Dashboard a single chat or single editor  
- Shadow-heavy Material elevation  
- Cloning Replit Agent / Deploy UI  
- Undoing Blueprint  
- Forcing Compact on Greek  
- Skipping human Pass? on M20/C8 by claiming R* “done”

---

## 10. Completeness answer (honest)

**Prior agents finished OPT-R1–R8 aesthetic waves; R9–R15 + R18 now shipped.** Primer + ChatGPT-calm layers sit on the same Minimal default. Synapse is **not** a blank slate for Replit — remaining residual value is Settings (R16) and motion polish (R17), with zero removals.

**Recommended next engineering step:** human Pass? on M20/C8 (if not done), then **OPT-R16** or **OPT-R17**.

---

## 11. Sign-off

| Role | Date | Notes |
|------|------|-------|
| Engineering (audit) | 2026-07-19 | Exhaustive residual audit vs Replit principles; R9–R18 proposed. R1–R8 already shipped. |
| Engineering (R10+R13) | 2026-07-19 | Prompt-first create + workspace/notebook canvas primacy shipped (Minimal-gated). |
| Engineering (R11) | 2026-07-19 | Status-as-console dock + inbox Errors/Activity + pipeline strip shipped. |
| Engineering (R18) | 2026-07-19 | Capture demo-course seed harness + atomic explore-demo onboarding. |
| Engineering (R12) | 2026-07-19 | Library/files + ⌘K path mono density; list-view course card testids. |
| Engineering (R15) | 2026-07-19 | Dashboard Continue hero + quieter masonry; Tasks List/Board; Analytics KPI chrome. |
| Engineering (R9) | 2026-07-19 | Optional icon-collapsed shell rail (tooltips/aria; expand restores labels). |
| Engineering (R14) | 2026-07-19 | Agent mode groups (Dialogue/Exam/Subject/Support); flow rail default collapsed. |
| | | |
