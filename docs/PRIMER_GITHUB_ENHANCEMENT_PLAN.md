# Primer / GitHub-inspired enhancement plan (zero feature removal)

**Status:** active SSoT for post–OPT-M12 work  
**Constraint:** add / reorganize / restyle only — **never remove** views, tools, enterprise, auth, i18n, or a11y  
**Brand rule:** Primer **principles**, not Octocat / Primer brand clone  
**Context (2026-07-19):** product not yet public — no active users → safe to set **Minimal as production default** (OPT-M13) while keeping Blueprint selectable

Related: `docs/PRIMER_MINIMAL_THEME.md`, `docs/PRIMER_MINIMAL_SCREENSHOT_MATRIX.md`, `docs/GAP_AUDIT.md` (OPT-M*)

---

## 0. Executive verdict

| Question | Answer |
|----------|--------|
| Can Synapse get GitHub-like clarity without losing features? | **Yes** — theme layer + progressive disclosure |
| Is every page/button already Primer-clean? | **No** — foundation OPT-M0–M12 shipped; surface polish continues |
| Safest architecture? | Visual/behavior disclosure layer on existing IA (NotebookLM 3-panel, 13 tools) |
| Default theme pre-launch? | **`minimal`** (flip OK with no live users); Blueprint remains Settings option |

---

## 1. What “GitHub” means here (principles → Synapse)

| Principle | GitHub / Primer | Synapse mapping | Non-negotiable |
|-----------|-----------------|-----------------|----------------|
| Content first | Code/text dominates | Reader / maps / quiz body dominate | Keep all 13 tools |
| Border over shadow | 1px borders | Flat panels under Minimal | Blueprint glass stays opt-in |
| Neutral canvas | Gray surfaces, sparse accent | `#f6f8fa` / `#0d1117` + Synapse cyan | No purple default |
| Dense but ordered | Many controls, fixed slots | Overflow + Status + palette | No tool merging |
| Progressive disclosure | Advanced in menus | Strips / guides collapsed by default | Actions remain reachable |
| Functional motion | Sheets only | Gate orbs/glow/stagger | Respect `prefers-reduced-motion` |
| Typography | Few sans steps | Inter scale 12/14/16/20/24 | No hero display in app shell |

**Out of scope (do not port):** Octocat, Primer marketing fonts, Replit orange, cream+terracotta, purple-on-white AI cliché, equal tool-wall dock, rewriting NotebookLM IA.

---

## 2. Inventory — shipped vs remaining

### 2.1 Already shipped (OPT-M0–M12)

| Wave | Capability |
|------|------------|
| M0–M1 | Lock docs; `minimal` / `minimal-dark` tokens; Settings + cycle |
| M2/M7 | Classic overflow; collapsible chrome (ToolFrame, Concept Lens) |
| M3 | Orbs/glow/motion gated in app-shell |
| M4/M11 | Flat CTAs/panels; modal/toast/popover border-first |
| M6 | Comfortable / Compact density; EL → comfortable |
| M8 | Zen toggle; landing mild vs app strict |
| M9 | Unified status bus (OCR/QA/stale) |
| M10 | Screenshot matrix checklist (manual captures) |
| M12 | Dashboard alerts / Agent flow & quick actions / due queues collapsed under Minimal |
| M13 | Default theme = Minimal (Blueprint opt-in) |
| M14 | App-shell CSS + Library / Analytics / Teacher collapsible chrome |
| M16 | Shell ⌘K discoverability + app-level `?` help (partial) |
| M17 | Shell notifications = activity + toast + proactive alerts |

### 2.2 Remaining UI gaps (polish — no removals)

| Area | Gap under Minimal | Proposed wave |
|------|-------------------|---------------|
| Note Analysis engine panel / Exam tip / Student Org hints | Collapsed under Minimal | M14 ✅ |
| Teacher / LTI leftover elevation | Occasional loud panels | polish optional |
| Library secondary tools / tip / quality alerts | Collapsed under Minimal | M14 ✅ |
| Analytics flow banner | Collapsed under Minimal | M14 ✅ |
| Hardcoded colors outside fab | Occasional warm-sand / rgba shadows in charts | M14 remainder |
| `index.css` size | Parallel theme languages (~5k lines) | M15 prune (theme-scoped only) |
| Screenshot matrix rows | Unchecked human captures | M20 (process) |
| Global Command Palette discoverability | Shell title/aria + badge; more actions optional | M16 ✅ partial |
| Keyboard shortcut help parity | App `?` when workspace closed; WS owns `?` when open | M16 ✅ partial |

### 2.3 Non-negotiable inventory (must remain 100%)

Landing, Onboarding, Dashboard, Library, Course (4 tabs), Note Analysis, Tasks, Agent, Analytics, Teacher, Student Org, Settings · Workspace 13 tools + discover/concept-bus/weak-areas · split/focus/zen · notebook · agent/course splits · OCR/conflict/remap · CRDT · IRT · FSRS · roster/assignments/discussion/gradebook · LTI/SAML/passback · Auth/sync/billing/Google/plugins · EL/EN · WCAG AA.

---

## 3. GitHub *product* patterns to adapt (features that help learners — add only)

These are **organizational / power-user** patterns inspired by GitHub, mapped to study workflows. None delete existing UI.

| GitHub pattern | Synapse adaptation | Benefit | Wave | Status |
|----------------|--------------------|---------|------|--------|
| Command palette (⌘K) | Promote global + workspace palette; more actions registered | Fewer permanent icons | M16 | Partial (shell label + global palette) |
| Keyboard shortcuts help (`?`) | Shell + workspace unified help sheet | Discoverability without chrome | M16 | Partial (app `?` when WS closed) |
| Density Comfortable/Compact | Already shipped | EL safety | M6 | Shipped |
| Notifications inbox | Map app toasts + agent alerts into one Status/Inbox affordance | Less strip noise | M17 | Shipped (shell bell panel) |
| Progressive “Files changed” style diffs | Reprocess / OCR / conflict panels as flat review surfaces | Clear decisions | M11 | Shipped (visual) |
| Issues / Projects triage | Tasks tabs + due queue (already); collapse chrome under Minimal | Focus | M12 | Shipped |
| Blame / history (read-only) | Annotation revision / sync conflict keep-local/keep-remote | Trust | W2 + AN | Shipped |
| Codespaces “focus” | Zen / Focus layouts — improve empty-state hints | Deep work | M8+ | Partial |
| README-first repo home | Course overview + notebook sources as content-first home | Orientation | M18 | Idea |
| Saved replies / templates | Agent quick actions + mode catalog (collapse under Minimal) | Speed | M12 | Shipped (disclosure) |
| Org settings vs user settings | Keep Teacher/LTI separate; flatter chrome only | Enterprise clarity | M14 | Partial (server caps collapsed) |
| Mobile responsive density | Compact optional; Comfortable default for `el` | Touch + Greek | M6 | Shipped |

**Explicit non-borrows:** social feed, marketplace chrome, Copilot purple marketing, sticky promo banners.

---

## 4. Aesthetic roadmap (Minimal theme)

### A. Tokens (done + tighten)
- Canvas `#f6f8fa` / `#0d1117`, radius 6–8px, elev≈0, single cyan accent
- M14: under Minimal, map `rounded-2xl` → panel radius; neutralize leftover `backdrop-blur` in app-shell

### B. Chrome consolidation (done + expand)
- Status bus + overflow shipped
- M14: Library secondary filters, Analytics “insight strips”, Teacher roster helper strips → `CollapsibleChromeSection` under Minimal only

### C. Motion
- Keep drawers / AnimatePresence / spinners
- M14: audit remaining `animate-pulse` decorative uses under Minimal

### D. Landing vs App
- Landing may keep mild atmosphere
- App shell strict Minimal (already gated)

### E. Brand
- Landing: Synapse hero-level name
- App: small sidebar wordmark; no ambient glow glyph under Minimal

---

## 5. Implementation waves (forward)

| ID | Scope | Acceptance | Risk |
|----|--------|------------|------|
| **OPT-M13** | Default theme → `minimal` (Blueprint still in Settings) | Fresh profile opens Minimal; saved prefs respected; tests updated | Low (pre-launch) |
| **OPT-M14** | Surface polish under Minimal (Library/Analytics/Teacher/Exam/Note/Student Org) | No feature loss; secondary chrome collapsible | **shipped** |
| **OPT-M15** | CSS hygiene: theme-scoped overrides only; document de-emphasize class inventory | No visual change to Blueprint/Spectrum | Medium |
| **OPT-M16** | Global ⌘K + `?` help parity with workspace | Same actions; fewer permanent icons | **partial** |
| **OPT-M17** | App-level Status/Inbox for toasts + proactive alerts (mirror workspace bus) | All signals reachable | **shipped** |
| **OPT-M18** | Content-first Course/Notebook empty & overview states | Clearer first minute | Low |
| **OPT-M19** | Optional `minimal-dark` as system-dark companion default | OS dark → minimal-dark when preference=system (optional) | Low |
| **OPT-M20** | Visual QA fill screenshot matrix before public launch | Matrix rows checked | Process |

---

## 6. Decision record — M13 default flip

**Decision:** Production default = **`minimal`**.  
**Rationale:** No active users; Primer calm matches launch product goals; Blueprint retained as identity option.  
**EL:** Chrome density remains Comfortable by default for `el`.  
**Rollback:** set `DEFAULT_THEME_PREFERENCE` back to `blueprint` (one-line).

---

## 7. What we will not do

- Remove or merge the 13 workspace tools  
- Replace NotebookLM 3-panel IA  
- Force Compact on Greek  
- Restyle Spectrum into the default path  
- One-shot rewrite of all of `index.css` without theme gates  
- Clone GitHub brand assets  

---

## 8. Priority of effort (ROI)

1. **M15 CSS prune** — maintainability  
2. **M20 visual QA** — launch gate  
3. **M18** content-first empty states (optional)  
4. **M16 deepen** — more palette actions / denser shell help (optional)  

---

## 9. Completeness answer (honest)

**Not everything is finished at pixel level.**  
**Yes — this document is the exhaustive enhancement plan:** principles, shipped inventory, GitHub-adapted feature map, aesthetic rules, forward waves, and non-goals — all under **zero functionality removal**.

Next engineering execution order: **M15 CSS prune → M20 screenshot QA → M18 empty states (optional)**.
