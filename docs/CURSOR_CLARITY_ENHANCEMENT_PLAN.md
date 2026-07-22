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
| **OPT-K21** | Mute status accents; cyan Execute (fix ink CTA) | **shipped** |
| **OPT-K22** | Dark white CTAs + slightly livelier muted status | **shipped** |
| **OPT-K23** | Light cyan Start session + status nudge | **shipped** |
| **OPT-K24** | Soft priority chips + cyan-harmonized status | **shipped** |
| **OPT-K25** | Ultra-soft light accents; ink typography + cyan CTAs | **shipped** |
| **OPT-K26** | Greek all-caps labels: strip τόνοι (`asAllCapsLabel` / `AllCapsLabel`) | **shipped** |
| **OPT-K27** | Slightly livelier light status pastels (mastery + bar fills) | **shipped** |
| **OPT-K28** | Soften cyan/grey readiness bars; nudge rose a touch stronger | **shipped** |
| **OPT-K29** | Dashboard Columns toggle: Minimal 2-col ↔ 1-col (wire layoutMode) | **shipped** |
| **OPT-K30** | Dark muted text +1 step for meta readability | **shipped** |
| **OPT-K31** | Light secondary/tertiary separation | **shipped** |
| **OPT-K32** | Light chips: +tint wash + primary-leaning label | **shipped** |
| **OPT-K33** | Progress track darker; soft fills +~5% presence | **shipped** |
| **OPT-K34** | `.rounded-xl` → panel radius (existing M14 + CTA md) | **shipped** |
| **OPT-K35** | Dashboard/status chips → pill/md (not capsules) | **shipped** |
| **OPT-K36** | `--btn-height-sm: 2rem` for icon + CTA sm | **shipped** |
| **OPT-K37** | Normalize meta≥10px; body hints → `text-xs` | **shipped** |
| **OPT-K38** | Eyebrow tracking 0.06–0.08em (cut 0.22em) | **shipped** |
| **OPT-K39** | SectionLabel `10px` → `sm:11px` | **shipped** |
| **OPT-K40** | Minimal modal title quieter (`text-base` semibold) | **shipped** |
| **OPT-K41** | Mobile stats 1-col; tablet 2; desktop 5 | **shipped** |
| **OPT-K42** | Course cards `p-3 sm:p-3.5` | **shipped** |
| **OPT-K43** | Mobile page bottom `pb-24` (nav clearance) | **shipped** |
| **OPT-K44** | Pair-row gap 1.15rem + divider padding | **shipped** |
| **OPT-K45** | Brand = CTA/focus; accent-cyan = non-CTA | **shipped** |
| **OPT-K46** | Dark status accents ±5% toward light pastels | **shipped** |
| **OPT-K47** | Focus ring 2px + brand focus tokens | **shipped** |
| **OPT-K48** | Smoke checklist (Human Pass M20/C8 — not self-signed) | **shipped** |
| **OPT-K49** | Residual badges: status chips ≥10px + md/pill radius | **shipped** |

**Default gate:** Minimal / Minimal Dark only. Blueprint untouched.  
**Width rule:** Compact `w-14` + `lg:ml-14` and Expanded `w-56` + `lg:ml-56` — main never underlays rail.

---

## Post-K48 findings (updated)

| Περιοχή | Κατάσταση μετά K30–K49 |
|---|---|
| Radius tokens | Αμετάβλητα: sm 4 / md 6 / panel 8 / pill 6 |
| Απόκλιση | CTA → `radius-md`· `.rounded-xl` → panel· chips → md/pill· nested stack ακόμα 0.25rem (by design) |
| Τυπογραφία | Meta ≥10px· body hints `text-xs`· SectionLabel `10→11 sm`· modal `text-base` semibold |
| Αντίθεση | Dark muted `#7d8590`· light secondary `#4d5560` / tertiary `#6e7781`· chips +track nudges |
| CTA | Αμετάβλητο (light cyan / dark white) — καλό |
| Responsive | Stats 1/2/5· course `p-3`· `pb-24`· pair gap 1.15rem |

### Ανοιχτό μόνο για άνθρωπο

- **M20 / C8 Human Pass?** — όχι self-sign  
- Workspace dense chrome (`text-[8px]` σε Annotation rail/toolbar) — εκτός Dashboard scope· υποψήφιο για μελλοντικό OPT-W*

---

## Non-goals

- Cursor brand / logo / Settings product clone  
- Removing any mode, tool, enterprise surface  
- Overlaying main under the sidebar on desktop  
- Undoing Blueprint or forcing Compact on Greek  

---

## Completeness

**OPT-K1–K49 shipped.** Compact default + expand kept; main offset `ml-14` / `ml-56`. Human Pass? **M20 / C8** still open (engineering must not self-sign). See canvas `cursor-clarity-post-k911-audit.canvas.tsx`.

### OPT-K48 smoke matrix (manual — do not self-sign)

| Surface | Light Minimal | Dark Minimal | Mobile | Tablet | Desktop |
|---------|---------------|--------------|--------|--------|---------|
| Dashboard (canvas + stacked) | ☐ | ☐ | ☐ | ☐ | ☐ |
| Modal header + ConfirmDialog | ☐ | ☐ | ☐ | ☐ | ☐ |
| PrimaryCTA / SecondaryCTA | ☐ | ☐ | ☐ | ☐ | ☐ |
| Priority / status chips | ☐ | ☐ | ☐ | ☐ | ☐ |
| Progress / readiness bars | ☐ | ☐ | ☐ | ☐ | ☐ |
| Focus-visible rings | ☐ | ☐ | ☐ | ☐ | ☐ |
