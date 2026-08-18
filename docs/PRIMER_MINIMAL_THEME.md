# Primer-inspired Minimal Theme (OPT-M)

**Status:** shipped through OPT-M19 (+ M20 human QA open); forward plan in `docs/PRIMER_GITHUB_ENHANCEMENT_PLAN.md`  
**Constraint:** zero functionality removal — visual + disclosure only  
**Default:** `minimal` (pre-launch; Blueprint remains Settings option)

## Goal

Adopt **GitHub Primer principles** (content-first, border-over-shadow, muted neutrals, sparse chrome, functional motion) while keeping **Synapse** identity (cyan accent, brand glyph, NotebookLM calm 3-panel IA, all 13 workspace tools).

This is **not** a GitHub clone (no Octocat/Primer brand assets).

## Non-negotiables

1. All AppViews, overlays, 13 tools + discover/concept-bus/weak-areas remain reachable  
2. Teacher / Student Org / LTI / SAML / Settings / Auth unchanged in capability  
3. EL/EN i18n retained; Greek gets comfortable density in minimal  
4. WCAG AA, focus-visible, ≥44px targets, `prefers-reduced-motion`  
5. Blueprint / light / spectrum / dark remain selectable  

## Themes

| Preference | `data-theme` | Role |
|------------|--------------|------|
| `minimal` | `minimal` | Light Primer-inspired canvas |
| `minimal-dark` | `minimal-dark` | Dark Primer-inspired canvas |

## Waves

| ID | Scope |
|----|--------|
| OPT-M0 | This lock doc + GAP_AUDIT entry |
| OPT-M1 | Tokens + Settings + ThemeToggle cycle + early boot |
| OPT-M2 | Chrome thinning (collapsible secondary chrome, flatter surfaces) |
| OPT-M3 | Gate orbs / glow / heavy motion under minimal* |
| OPT-M4 | Calm panels / CTAs / conflict surfaces under minimal* |
| OPT-M5 | Tests + visual acceptance (blueprint stays default) |
| OPT-M6 | Density Comfortable / Compact (`data-density`) |
| OPT-M7 | Classic overflow menu + ContextBar status inbox |
| OPT-M8 | Zen chip discoverability; landing mild vs app-shell strict |
| OPT-M9 | Unified strip bus (OCR/QA/stale → Status panel) + screenshot matrix |
| OPT-M10 | Visual QA checklist (matrix) — captures are manual / local |
| OPT-M11 | Modal/overlay border-first + remove warm `#faf8f5` hardcodes in fab |
| OPT-M12 | Shell density: Dashboard/Tasks/Agent progressive disclosure under minimal |
| OPT-M13 | Production default → Minimal (pre-launch; Blueprint selectable) |
| OPT-M14 | Page secondary chrome collapsible (Library/Analytics/Teacher/Exam/Note/Student Org) |
| OPT-M16 | Shell ⌘K label + shell/workspace `?` help variants |
| OPT-M17 | Shell notifications inbox = activity + toast + proactive alerts |
| OPT-M15 | Extract Minimal CSS to `src/styles/primer-minimal.css` + inventory doc |
| OPT-M18 | Course path/sources content-first empty states |
| OPT-M19 | `system` theme → `minimal` / `minimal-dark` |
| OPT-M20 | Screenshot matrix (manual captures) — see `PRIMER_MINIMAL_SCREENSHOT_MATRIX.md` |

## CSS layout (M15)

- Tokens + overrides: `src/styles/primer-minimal.css`
- Inventory: `docs/PRIMER_MINIMAL_CSS_INVENTORY.md`
- Import: top of `src/index.css` (after Tailwind)

## OPT-M9 — Status bus

- `WorkspaceStatusBusProvider` wraps the study workspace body.
- `WorkspacePanelWarnStrip` / `WorkspaceQaStatusStrip` register into the bus.
- Under **Minimal** or **Compact**, strips are visually mirrored (`data-status-mirrored`) into `WorkspaceStatusPanel`; DOM + actions stay intact.
- Clicking a Status item temporarily reveals the in-tool strip (flash + scroll).
- Screenshot acceptance checklist: `docs/PRIMER_MINIMAL_SCREENSHOT_MATRIX.md`.

## Design rationale — the Study Workspace type/radius override (OPT-K142/K155/K156)

`[data-testid="study-workspace"]` in `src/index.css` (~line 6903) redeclares a tighter
`--type-*`/`--radius-*` band than the rest of the app — **scoped to workspace context, not to
the Minimal theme**. It applies identically under `dark`, `light`, `blueprint`, `minimal`, every
theme — this is a density decision, not a theme decision, and the two should not be conflated
(an earlier cross-project audit misread this override as theme-specific; it isn't).

Concretely, inside the Study Workspace only:

| Token | App default | Workspace override |
|---|---|---|
| `--type-micro` | 0.6875rem (11px) | 0.75rem (12px) |
| `--type-title` | 1.125rem (18px) | 0.875rem (14px) — "titles ≈ body" |
| `--radius-sm`/`-md` | 0.375rem/0.5rem | 0.5rem (both) |
| `--radius-lg` | 0.75rem | 0.625rem — "slightly tighter wells" |

**Why** (from the existing inline comment, made discoverable here rather than only in the CSS
source): the Study Workspace hosts up to 13 tool panels at once in a dense, multi-column layout
(per the 12-panel audit referenced in `UPGRADE_BACKLOG` Wave E) — a near-flat title/body
hierarchy and a tighter radius scale reduce visual noise and "hierarchy jump" between adjacent
panel chrome, at a density the rest of the app (Dashboard, Library, Settings) doesn't need. The
type floor was deliberately raised from a prior 10px (eye strain) to 12px as part of the same
change — never below the platform-wide 11px floor either way.

This is the direct Synapse equivalent of Canon's own documented principle that visual variation
tied to a real, named reason (there: per-theme personality; here: per-context density) is a
deliberate decision, not drift to "fix" — recorded so a future pass doesn't flatten it back to
the app-wide scale under the assumption it's an inconsistency.

## Acceptance

- Switching to Minimal does not hide any tool, strip action, or settings section  
- Orbs/glows off in **app-shell**; landing may keep mild orbs  
- Compact density folds classic chrome into overflow; all actions remain in the menu  
- Status inbox folds context chips; expand reveals every chip action  
- Unified Status panel lists OCR/QA/stale strips; reveal restores in-tool visibility  
- Header theme cycle includes Minimal → Minimal Dark  
- Existing users with stored `blueprint` are unaffected  
