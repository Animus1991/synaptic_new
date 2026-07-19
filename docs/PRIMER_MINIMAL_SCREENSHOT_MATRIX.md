# OPT-M9 — Primer Minimal acceptance screenshot matrix

**Purpose:** Visual QA checklist proving Minimal / Compact clarity without feature loss.  
**PR:** `cursor/ui-primer-minimal-2ff7`  
**Constraint:** Capture **before/after** or at least Minimal vs Blueprint for each row. Do not omit tools.

## How to capture

1. Use desktop 1280×800 and mobile 390×844.
2. Theme cycle: **Blueprint** (baseline) → **Minimal** → **Minimal Dark**.
3. Density: **Comfortable** then **Compact** (on Minimal).
4. Store under `artifacts/primer-minimal/` (local; do not commit binaries unless requested).

## Matrix

| # | Surface | Viewport | Theme / density | Must show | Pass? |
|---|---------|----------|-----------------|-----------|-------|
| 1 | Landing | Desktop | Minimal | Synapse brand hero; mild orbs OK | ☐ |
| 2 | Shell Dashboard | Desktop | Minimal | Flat panels; no app-shell orbs | ☐ |
| 3 | Shell Dashboard | Desktop | Minimal Dark | Same, dark canvas | ☐ |
| 4 | Library | Desktop | Minimal | Courses/files tabs intact | ☐ |
| 5 | Course (path tab) | Desktop | Minimal | 4 tabs reachable | ☐ |
| 6 | Tasks | Desktop | Minimal | Today/weak/reviews/mistakes | ☐ |
| 7 | Agent | Desktop | Minimal | Modes + chat | ☐ |
| 8 | Teacher dashboard | Desktop | Minimal | Classes/roster chrome present | ☐ |
| 9 | Settings → Interface | Desktop | Any | Theme + density toggles | ☐ |
| 10 | Workspace classic | Desktop | Minimal + Compact | ⋯ menu; Zen chip; Status panel | ☐ |
| 11 | Workspace notebook | Desktop | Minimal | Thin chrome; Status when strips fire | ☐ |
| 12 | Tool: Reader | Desktop | Minimal + Compact | Body dominant; OCR/warn in Status if active | ☐ |
| 13 | Tool: Annotations | Desktop | Minimal | Toolbar + overlay; conflicts flat | ☐ |
| 14 | Tool: Quiz | Desktop | Minimal + Compact | Stale/warn mirrored to Status; reveal works | ☐ |
| 15 | Tool: Leitner | Desktop | Minimal | Stale banner → Status | ☐ |
| 16 | Tool: Simulator | Desktop | Minimal | Stale + warn → Status | ☐ |
| 17 | Tool: Concept map | Desktop | Minimal | Graph chrome intact | ☐ |
| 18 | Tool: Feynman | Desktop | Minimal | Weak extraction → Status | ☐ |
| 19 | Mobile workspace | 390 | Minimal | Intel pills + Status reachable | ☐ |
| 20 | Reduced motion | Desktop | Minimal | No decorative float | ☐ |

## Status bus functional checks (no screenshot required)

| Check | Pass? |
|-------|-------|
| Open Quiz with weak extraction → Status count ≥ 1 | ☐ |
| Click Status item → strip flashes / scrolls into view | ☐ |
| Switch to Blueprint → in-tool strips visible again (not mirrored) | ☐ |
| Compact + Minimal → classic header overflow still lists all actions | ☐ |
| EL + unset density → Comfortable | ☐ |

## Sign-off

| Role | Date | Notes |
|------|------|-------|
| Engineering | 2026-07-19 | OPT-M11/M12 code landed; matrix rows remain for human visual capture (local `artifacts/primer-minimal/`). Not a release blocker. |
| | | |
