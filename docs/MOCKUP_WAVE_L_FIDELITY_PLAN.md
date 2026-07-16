# Wave L — Canvas fidelity closeout (Dashboard / Tasks / Library / Analytics) + K-2

**Date:** 2026-07-16  
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only  
**Inputs:** 11 Replit canvas screenshots (Dashboard×3, Tasks×3, Library×1, Analytics×4) · Waves J–K tip · user density + no-emoji constraints  
**Non-negotiables:** 100% tool functionality · denser type than Replit · **no emoji / unicode chrome arrows** · Phosphor/line icons · warm light + dark first-class · upgrade spectrum/blueprint without wiping identity · no secrets/PII · merge production + canvas

**Companions:** [`MOCKUP_WAVE_K_FIDELITY_PLAN.md`](./MOCKUP_WAVE_K_FIDELITY_PLAN.md), [`MOCKUP_WAVE_J_FIDELITY_PLAN.md`](./MOCKUP_WAVE_J_FIDELITY_PLAN.md), [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md)

---

## 1. Method

| Step | Action |
| ---- | ------ |
| 1 | Diff each screenshot chrome block vs production after Wave K |
| 2 | Prefer production data wiring; adopt canvas IA / accent / density |
| 3 | Ship Sprint L-1 (P1) fully; track L-2 without omission |
| 4 | Secret-scan; push only `synaptic_new` `feat/mockup-implementation` |

---

## 2. Already shipped (do not redo)

Wave A–K: hero IA, hub chips, Create Plan secondary, shell utilities, retention markers, warm-ink, spectrum not forced to warm-sand, horizontal 5-bin calibration, sepia heatmap light-only, Library tip dismiss, ΤΡΕΧΕΙ badge, FSRS forecast, Visual Lab prefs.

---

## 3. Must not remove

- Workspace tools, Agent, MCP, Research, Visual Lab, hub popovers  
- Sankey / waterfall / treemap / timeline (flow disclosure body)  
- Spectrum vibrant identity · Blueprint glass dark identity  
- Warm light cream pages · Dark editorial contrast  
- NotebookLM import, RAG banner, cross-library synthesis, post-upload banner  

---

## 4. Screenshot gaps → Sprint L-1

| ID | Surface | Gap | Fix |
| -- | ------- | --- | --- |
| **L-A01** | Analytics | Flow charts buried only in `<details>`; canvas shows full-width **Διάγραμμα Ροής & Κατανομή Γνώσης** banner above readiness | Prominent banner CTA that opens/scrolls to flow disclosure; keep full chart body |
| **L-A02** | Analytics | You-vs-Real labels use generic icons; canvas uses diagonal arrows + Βαθμονομημένο | `ArrowUpRight` / `ArrowDownRight` / `Minus` + EN “Underestimation” |
| **L-A03** | Analytics | Visual Lab summary copy less canvas-like | Align disclosure label to “Visual Lab / Οπτικό Εργαστήριο” |
| **L-L01** | Library | Banner order ≠ canvas (RAG → success → NotebookLM → combined → tip) | Reorder: RAG → PostUpload → NotebookLM → Cross → Tip → stats |
| **L-T01** | Tasks | Tab bar missing far-right sliders filter control | `DescriptiveStickyTabBar` trailing action → scroll to session launchers |
| **L-S01** | Settings | Theme picker text-only chips (K-S01) | Icon + denser labels for dark/light/spectrum/blueprint/system |
| **L-D01** | Dashboard | Secondary panels still `p-5` vs dense canvas | Density pass `p-3.5` on mastery/priority panels |
| **L-X03** | CourseView | Oversized mastery numerals (K-X03) | `text-2xl`/`text-3xl` → `text-xl`; topic row `p-5` → `p-3.5` |

### Theme matrix (unchanged from Wave K — verify only)

| Theme | Page cream scope | Heatmap | Notes |
| ----- | ---------------- | ------- | ----- |
| light | warm-sand nest | sepia | preferred + canvas |
| dark | none | brand ramp | preferred |
| spectrum | **none** | brand ramp | keep lavender |
| blueprint | none | brand ramp | keep glass |

---

## 5. Sprint L-2 (tracked, no omission)

| ID | Item | Priority |
| -- | ---- | -------- |
| L-D02 | Dashboard left-column “Ισχύς ανάκλησης” thin bar above concept mastery (canvas shot 2) | P2 |
| L-T02 | Optional high-priority expand chrome polish on flashcard tasks | P3 |
| L-A04 | Promote Visual Lab to sticky footer bar (in addition to disclosure) | P3 |
| L-X04 | Agent embedded chrome density (out of canvas set) | P3 |

---

## 6. Security

- Never commit `.env`, live keys, Google secrets, JWT secrets, user dumps.  
- Push: **Animus1991/synaptic_new** · **feat/mockup-implementation** only.

---

## 7. Acceptance (Wave L-1)

- [x] Analytics flow banner present; charts still reachable
- [x] You-vs-Real arrow icons + calibration wording
- [x] Library banner order matches canvas
- [x] Tasks tab trailing filter control
- [x] Settings theme chips show icons
- [x] Dashboard / CourseView denser padding & numerals
- [x] Tools intact; no secrets in commit

**Shipped:** Wave L Sprint L-1 (2026-07-16) on `feat/mockup-implementation`.
