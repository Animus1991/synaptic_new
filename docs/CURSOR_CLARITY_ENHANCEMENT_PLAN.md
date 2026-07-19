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
| **OPT-K4** | Icon/CTA monochrome default; accent only for state | **shipped** |
| **OPT-K5** | UtilityRow + UsageBar primitives | **shipped** |
| **OPT-K6** | Dashboard/Analytics section stacks (not card walls) | **shipped** |
| **OPT-K7** | PageHeader text-first + outline/solid CTA pair | **shipped** |
| **OPT-K8** | Settings/Teacher Spending-like wells | **shipped** |
| **OPT-K9** | Anti-stretch content measure inside full-width main | **shipped** |
| **OPT-K9b** | Proximity layout + real densify + Practice inline | **shipped** |
| **OPT-K10** | Shell chrome calm (overflow secondary CTAs/badges) | **shipped** |
| **OPT-K11** | Single well depth; no duplicate retrieval wells | **shipped** |
| **OPT-K11b** | Extend single-well past mid-stack; quiet Study chips | **shipped** |
| **OPT-K12** | Studio/tool grid distinct monochrome icons | **shipped** |
| **OPT-K13** | Rail expand discoverability (keep compact default) | **shipped** |
| **OPT-K14** | Library chip overflow (+N); all tags reachable | **shipped** |
| **OPT-K15** | Analytics viz chrome quiet; keep all widgets | **shipped** |
| **OPT-K16** | Agent mode chrome monochrome under Minimal | **shipped** |
| **OPT-K17** | Dashboard signal pass (urgency lines + one-step + almost-there) | **shipped** |
| **OPT-K18** | Dashboard full-span + pair narrow sections | **shipped** |
| **OPT-K19** | Soft status red + exam primary + page rhythm | **shipped** |
| **OPT-K20** | Cyan brand CTAs (restore preferred button ink) | **shipped** |

**Default gate:** Minimal / Minimal Dark only. Blueprint untouched.  
**Width rule:** Compact `w-14` + `lg:ml-14` and Expanded `w-56` + `lg:ml-56` — main never underlays rail.

---

## Non-goals

- Cursor brand / logo / Settings product clone  
- Removing any mode, tool, enterprise surface  
- Overlaying main under the sidebar on desktop  
- Undoing Blueprint or forcing Compact on Greek  

---

## Completeness

**OPT-K1–K18 shipped.** Compact default + expand kept; main offset `ml-14` / `ml-56`. Human Pass? **M20 / C8** still open (engineering must not self-sign). See canvas `cursor-clarity-post-k911-audit.canvas.tsx`.
