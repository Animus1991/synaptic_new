# OPT-C8 — ChatGPT-calm acceptance screenshot matrix

**Purpose:** Visual QA for conversation-first calm under Minimal (sibling to Primer M20).  
**Constraint:** Zero feature removal — modes, citations, shell nav, Library filters, Dashboard hub remain.  
**CSS SSoT:** `src/styles/chatgpt-calm.css` + `docs/CHATGPT_MINIMAL_ENHANCEMENT_PLAN.md`

## How to capture

1. **Automated dump:** `npm run capture:chatgpt-calm`  
   Writes PNGs + `MANIFEST.md` under `artifacts/chatgpt-calm/` (Playwright; not a CI gate).
2. Theme: **Minimal** (and one **Minimal Dark** Agent row).
3. Do not commit PNG binaries unless requested. Review PNGs and mark Pass? below.
4. Primer M20 (`npm run capture:primer-minimal`) remains the full-surface matrix; this checklist is calm-focused.

## Matrix

| # | Surface | Viewport | Theme | Must show | Pass? |
|---|---------|----------|-------|-----------|-------|
| C1 | Agent calm thread | Desktop | Minimal | Centered ~48rem column; soft user bubble; sticky composer | ☐ |
| C2 | Agent quiet modes | Desktop | Minimal | Mode rail present; no rainbow per-mode icon colors; all modes reachable | ☐ |
| C3 | Shell quiet nav | Desktop | Minimal | Single-line nav labels; rail ~w-56; all `nav-*` still clickable | ☐ |
| C4 | Notebook calm | Desktop | Minimal | 3-panel intact; softer chat/studio chrome | ☐ |
| C5 | Dashboard soft | Desktop | Minimal | Hub intact; quieter stats/panels (`dashboard-calm`) | ☐ |
| C6 | Library soft list | Desktop | Minimal | Filters/upload kept; softer course rows; list toggle available | ☐ |
| C7 | Agent Minimal Dark | Desktop | Minimal Dark | Same calm conversation chrome on dark canvas | ☐ |
| C8 | Regenerate affordance | Desktop | Minimal | After an agent reply, `agent-regenerate` visible near composer footer | ☐ |
| C9 | Settings theme story | Desktop | Minimal | `settings-theme-hint` + Minimal/Blueprint labels clear | ☐ |
| C10 | Mobile Agent composer | 390 | Minimal | Sticky composer; send/attach ≥40px; above bottom nav | ☐ |
| C11 | Mobile quiet nav | 390 | Minimal | Bottom labels single-line; drawer close ≥40px; all `nav-mobile-*` | ☐ |

## Sign-off

| Role | Date | Notes |
|------|------|-------|
| Engineering | 2026-07-19 | Capture helper: `npm run capture:chatgpt-calm` → `artifacts/chatgpt-calm/`. **C8 launch gate = human Pass? checkboxes.** Capture dump 2026-07-19 (C1–C3,C5,C7–C8 PNGs ok; C4 notebook soft-skip). |
| Engineering (re-capture) | 2026-07-19 | Post R18+R12 dump: **C1–C8 all PNGs yes** (incl. `c4-notebook-calm.png`). Human Pass? still open. |
| Engineering (C6/C7) | 2026-07-19 | Enterprise headers + mobile composer/nav. Re-run capture after pull for C9–C11. |
| Engineering (post OPT-K) | 2026-07-19 | OPT-K1–K9+K11 landed after prior dump. **Re-run `npm run capture:chatgpt-calm` before Pass?** — C5/C9 especially. Studio icons → OPT-K12. |
| | | |
