# OPT-M15 — Primer Minimal CSS inventory

**Source of truth for theme-scoped overrides:** `src/styles/primer-minimal.css`  
**Imported from:** `src/index.css` (immediately after Tailwind)  
**Rule:** every de-emphasize override must be gated by  
`:is([data-theme="minimal"], [data-theme="minimal-dark"])`  
(or token blocks `[data-theme="minimal"]` / `[data-theme="minimal-dark"]`).  
Blueprint / Spectrum / light / dark must not change when editing this file.

## Token blocks

| Selector | Role |
|----------|------|
| `[data-theme="minimal"]` | Light Primer canvas + radii + elev≈0 + cyan brand |
| `[data-theme="minimal-dark"]` | Dark Primer canvas (`#0d1117` family) |

## De-emphasized class inventory (visual only)

| Class / pattern | Effect under Minimal* |
|-----------------|------------------------|
| `.platform-blueprint-orbs`, `.platform-hero-glow-orbs` (app-shell) | Hidden |
| `.landing-hero-orbs`, `.landing-default-orbs` | Opacity 0.35 (kept mild) |
| `.glass`, `.glass-strong`, `.blueprint-surface*` | No blur/shadow; border + card fill |
| `.ux-card`, `.platform-panel-*` | Flat border-first panels |
| `.glow-brand`, `.glow-teal`, `.glow-cyan`, `.animate-pulse-glow` | Animation + glow off |
| `.gradient-text` | Solid text color |
| `.ws-pill`, `.platform-pill` | Squarer radius (`--radius-pill`) |
| `.ux-primary-cta`, `.ux-secondary-cta` | Flat CTAs |
| `.ux-calm-panel`, `.ux-spark-panel`, `.ux-callout` | Border-first |
| `.annotation-conflict-panel`, OCR correction panel | Flat |
| `.ws-fab` (+ ink/primary children) | Semantic surface/border (no warm hardcode) |
| `h1–h3`, `.ws-serif`, `.type-display-sm`, `.landing-display` | Sans stack |
| `.platform-nav-active` | Left brand bar, no glow |
| `.ux-modal-panel`, `.app-toast-banner`, confirm/reprocess modals, `shadow-xl/2xl` | Shadow removed |
| `.ux-elev-popover`, `shadow-lg` | Hairline border elevation |
| `.concept-lens-chip` | No blur; card chip |
| `.app-shell .rounded-xl/2xl` | Map to `--radius-panel` |
| `.app-shell .backdrop-blur*` | Blur off |
| `.blueprint-fade-up`, `.blueprint-motion-section` | Decorative motion off (when motion allowed) |

## Density + status (related, same file)

| Selector | Effect |
|----------|--------|
| `[data-density="compact"]` | Tighter chrome padding / hit targets |
| compact + minimal tool strips | Quieter radius/shadow |
| `[data-status-mirror="true"]` mirrored strips | Visually clipped; DOM kept for reveal |
| `.ws-status-flash` | Reveal outline |

## Explicit non-gates (keep pulse / busy feedback)

Do **not** globally disable Tailwind `animate-pulse` under Minimal — it marks loading/busy states (boot skeleton, reprocess CPU, typing caret). Only decorative glow helpers (`.animate-pulse-glow` / `.glow-*`) are gated.

## How to extend safely

1. Add overrides only in `src/styles/primer-minimal.css`.  
2. Always theme-gate selectors.  
3. Append a row to the inventory table above.  
4. Spot-check Blueprint + Spectrum after the change.
