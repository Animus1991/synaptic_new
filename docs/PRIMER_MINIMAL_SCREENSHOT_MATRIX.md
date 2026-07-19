# OPT-M20 — Primer Minimal acceptance screenshot matrix

**Purpose:** Visual QA checklist proving Minimal / Compact clarity without feature loss.  
**Constraint:** Capture **before/after** or at least Minimal vs Blueprint for each row. Do not omit tools.  
**CSS SSoT:** `src/styles/primer-minimal.css` + `docs/PRIMER_MINIMAL_CSS_INVENTORY.md`

## How to capture

1. **Automated dump (recommended):** `npm run capture:primer-minimal`  
   Writes PNGs + `MANIFEST.md` under `artifacts/primer-minimal/` (Playwright; not a CI gate).
2. Use desktop 1280×800 and mobile 390×844 for any manual fill-ins.
3. Theme cycle: **Blueprint** (baseline) → **Minimal** → **Minimal Dark**.
4. Density: **Comfortable** then **Compact** (on Minimal).
5. Do not commit PNG binaries unless requested. Review PNGs and mark Pass? below.

## Matrix

| # | Surface | Viewport | Theme / density | Must show | Pass? |
|---|---------|----------|-----------------|-----------|-------|
| 1 | Landing | Desktop | Minimal | Synapse brand hero; mild orbs OK | ☐ |
| 2 | Shell Dashboard | Desktop | Minimal | Flat panels; no app-shell orbs; alerts collapsible | ☐ |
| 3 | Shell Dashboard | Desktop | Minimal Dark | Same, dark canvas | ☐ |
| 4 | Library | Desktop | Minimal | Courses/files tabs; Tools & tips collapsed by default | ☐ |
| 5 | Course (path tab) | Desktop | Minimal | 4 tabs reachable | ☐ |
| 6 | Tasks | Desktop | Minimal | Today/weak/reviews/mistakes; due queue collapsed | ☐ |
| 7 | Agent | Desktop | Minimal | Modes + chat; flow/quick actions collapsible | ☐ |
| 8 | Analytics | Desktop | Minimal | KPIs visible; flow banner collapsible | ☐ |
| 9 | Teacher dashboard | Desktop | Minimal | Classes/roster; server caps collapsible | ☐ |
| 10 | Student Org | Desktop | Minimal | Classes list; org tips collapsible | ☐ |
| 11 | Settings → Interface | Desktop | Any | Theme + density toggles; Blueprint selectable | ☐ |
| 12 | Shell inbox (bell) | Desktop | Minimal | Needs attention (toast/alerts) + activity | ☐ |
| 13 | Shell ⌘K / `?` | Desktop | Minimal | Search shows shortcut; `?` opens help | ☐ |
| 14 | Workspace classic | Desktop | Minimal + Compact | ⋯ menu; Zen chip; Status panel | ☐ |
| 15 | Workspace notebook | Desktop | Minimal | Thin chrome; Status when strips fire | ☐ |
| 16 | Tool: Reader | Desktop | Minimal + Compact | Body dominant; OCR/warn in Status if active | ☐ |
| 17 | Tool: Annotations | Desktop | Minimal | Toolbar + overlay; conflicts flat | ☐ |
| 18 | Tool: Quiz | Desktop | Minimal + Compact | Stale/warn mirrored to Status; reveal works | ☐ |
| 19 | Tool: Leitner | Desktop | Minimal | Stale banner → Status | ☐ |
| 20 | Tool: Simulator | Desktop | Minimal | Stale + warn → Status | ☐ |
| 21 | Tool: Concept map | Desktop | Minimal | Graph chrome intact | ☐ |
| 22 | Tool: Feynman | Desktop | Minimal | Weak extraction → Status | ☐ |
| 23 | Note Analysis | Desktop | Minimal | Summary cards; engine details collapsible | ☐ |
| 24 | Exam Prep setup | Desktop | Minimal | Modes intact; tip collapsible | ☐ |
| 25 | Mobile workspace | 390 | Minimal | Intel pills + Status reachable | ☐ |
| 26 | Reduced motion | Desktop | Minimal | No decorative float | ☐ |

## Status bus + inbox functional checks (no screenshot required)

| Check | Pass? |
|-------|-------|
| Open Quiz with weak extraction → Status count ≥ 1 | ☐ |
| Click Status item → strip flashes / scrolls into view | ☐ |
| Switch to Blueprint → in-tool strips visible again (not mirrored) | ☐ |
| Compact + Minimal → classic header overflow still lists all actions | ☐ |
| EL + unset density → Comfortable | ☐ |
| Bell badge includes proactive alert count | ☐ |
| Open bell with live toast → Needs attention shows toast | ☐ |
| Fresh profile → Minimal default | ☐ |
| Settings can switch back to Blueprint | ☐ |

## Sign-off

| Role | Date | Notes |
|------|------|-------|
| Engineering | 2026-07-19 | M0–M19 code landed. Capture helper: `npm run capture:primer-minimal` → `artifacts/primer-minimal/`. **M20 launch gate = human Pass? checkboxes.** |
| | | |
