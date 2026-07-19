# Cursor-like clarity plan (zero feature removal)

**Status:** active SSoT for OPT-K* under Synapse Minimal  
**Constraint:** restyle / reorganize / disclose only — **never remove** views, tools, enterprise, auth, i18n, or a11y  
**Brand rule:** Cursor **product clarity** (sidebar + full remaining main, thin borders, weight hierarchy, label/value rows) — **not** Cursor logo, marketing, or Spending feature clone  
**Relation to other axes:**

| Axis | SSoT | What it owns |
|------|------|----------------|
| **Cursor clarity (OPT-K*)** | This doc | Neutral nav, full-width canvas, flat panels, utility rows |
| **Primer / GitHub (OPT-M*)** | `docs/PRIMER_GITHUB_ENHANCEMENT_PLAN.md` | Density, status bus, overflow, Minimal tokens |
| **ChatGPT-calm (OPT-C*)** | `docs/CHATGPT_MINIMAL_ENHANCEMENT_PLAN.md` | Conversation column, soft bubbles |
| **Replit clarity (OPT-R*)** | `docs/REPLIT_CLARITY_ENHANCEMENT_PLAN.md` | Workspace/create primacy, console Status |

All four **coexist** under `minimal` / `minimal-dark`. Blueprint stays expressive / selectable.

CSS: `src/styles/cursor-clarity.css` (imported after `replit-clarity.css`).

---

## Waves

| Wave | Scope | Status |
|------|--------|--------|
| **OPT-K1** | Shell nav groups + neutral active pill (no brand accent bar) | **shipped** |
| **OPT-K2** | Main uses full remaining width; no sidebar overlay; page `max-w-none` asserted | **shipped** |
| **OPT-K3** | Flat hairline panels; kill default tint washes; quiet PageHeader icon | **shipped** |
| **OPT-K4** | Icon/CTA monochrome default; accent only for state | planned |
| **OPT-K5** | UtilityRow + UsageBar primitives | planned |
| **OPT-K6** | Dashboard/Analytics section stacks (not card walls) | planned |
| **OPT-K7** | PageHeader text-first + outline/solid CTA pair | partial (icon quiet in K3) |
| **OPT-K8** | Settings/Teacher Spending-like wells | planned (builds on R16) |

**Default gate:** Minimal / Minimal Dark only. Blueprint untouched.

---

## Non-goals

- Cursor brand / logo / Settings product clone  
- Removing any mode, tool, enterprise surface  
- Overlaying main under the sidebar on desktop  
- Undoing Blueprint or forcing Compact on Greek  

---

## Completeness

**OPT-K1–K3 foundation shipped.** Visible Cursor-calm chrome: grouped shell labels, grey active pill, full-width main, flat panels. Next: **OPT-K5/K6** for hub content rows.
