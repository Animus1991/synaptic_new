# Wave J — Canvas screenshot fidelity (post Wave I)

**Date:** 2026-07-16  
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only  
**Inputs:** 10 Replit canvas screenshots (Dashboard×3, Tasks×2, Library×2, Analytics×3) re-audited after Wave I (`8a671c3`)  
**Non-negotiables:** 100% tool functionality · denser type than Replit · **no emojis / no unicode chrome** · Phosphor/line icons · warm light + dark first-class · no secrets/PII · merge best of production + canvas

**Companions:** [`MOCKUP_WAVE_I_FIDELITY_PLAN.md`](./MOCKUP_WAVE_I_FIDELITY_PLAN.md), [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md), [`GAP_AUDIT.md`](./GAP_AUDIT.md)

---

## 1. Method

| Step | Action |
| ---- | ------ |
| 1 | Inventory every chrome block in each of the 10 screenshots |
| 2 | Diff against production tip after Wave I-2/I-3 |
| 3 | Prefer production data wiring; reshape chrome / order / density only |
| 4 | Ship Sprint J-1 (P1) fully; track J-2 without omission |
| 5 | Secret-scan; push only `synaptic_new` `feat/mockup-implementation` |

**Density contract:** H1 ≈ 18–20px · section labels `text-[10px]` uppercase · KPI chips compact · cards `p-3` · zero emoji chrome.

---

## 2. Already shipped (do not redo)

Wave A–I including: hub 4-chip + overflow, alert 2×2, rail IA, Create Plan CTA, Library corner badges/topic chips, Analytics FSRS labels, sticky PageHeader, SectionLabel adoption, workspace resume dedupe.

---

## 3. Must not remove

- All workspace tools, Concept Bus, Agent, MCP, Research, Visual Lab  
- Hub popups (calendar / wallpaper / personal dates / reviews)  
- Kanban strip, proactive alerts, smart CTAs  
- Blueprint theme (scoped warm-sand fidelity only)

---

## 4. Screenshot inventory → remaining gaps

### Dashboard (shots 1–3)

| Mockup block | Production after I | Gap ID |
| ------------ | ------------------ | ------ |
| Greeting + Phosphor time icon (no emoji) | Done | — |
| Active topic pill («Ενεργό: …») | Missing | **J-D01** |
| 5 compact KPI chips **above** workspace / actions | Stats exist but **below** hub | **J-D02** |
| Active workspace resume (eyebrow + Continue) | Exists; denser mockup strip | **J-D03** |
| 4-chip actions with short labels (Ημερολόγιο / Ανέβασμα / Συνεδρία / Workspace) | Long carousel labels | **J-D04** |
| 2×2 alert grid | Done (I-D02) | — |
| Dual secondary + Εκτέλεση | Done | — |
| Readiness + coverage pair | Done | — |
| Rail: FSRS TODAY/TOMORROW/3d, calendar, next steps | Done | — |
| Concept mastery / prereq / urgent / misconceptions | Done (SectionLabel) | — |

### Tasks (shots 4–5)

| Mockup block | Production after I | Gap ID |
| ------------ | ------------------ | ------ |
| 5 session launchers + ΠΡΟΤΕΙΝΕΤΑΙ | Done | — |
| Δημιούργησε Πλάνο | Done | — |
| Tabs with counts | Done | — |
| Almost there + Recall reminder | Done | — |
| **ΤΡΕΧΕΙ** prominent uppercase badge | Partial («Τρέχει τώρα» soft chip) | **J-T01** |
| Priority left border + FSRS expand | Done | — |

### Library (shot 6)

| Mockup block | Production after I | Gap ID |
| ------------ | ------------------ | ------ |
| RAG / post-upload / tip | Tip exists; not dashed «Συμβουλή» | **J-L01** |
| Stats 2-chip + NotebookLM + Combined study | Done | — |
| Filters + cards + corner badges | Done | — |
| Search clear uses unicode ✕ | Unicode chrome | **J-L02** |

### Analytics (shots 7–9)

| Mockup block | Production after I | Gap ID |
| ------------ | ------------------ | ------ |
| KPI / ring / FSRS labels / 3-col / Visual Lab | Done | — |
| 90-day heatmap sepia (warm) | Generic greens | **J-A01** |
| Calibration buckets row | Done | — |

---

## 5. Sprint J-1 (this wave — P1)

| ID | Surface | Item | Effort |
| -- | ------- | ---- | ------ |
| J-D01 | Dashboard | Active topic pill from workspace live | S |
| J-D02 | Dashboard | Hero IA: greeting → KPI 5-chip → workspace → 4-chip actions | M |
| J-D03 | Dashboard | Compact resume strip (SectionLabel eyebrow + Continue) | S |
| J-D04 | Dashboard | Short hub chip labels (compact i18n keys) | S |
| J-T01 | Tasks | Prominent **ΤΡΕΧΕΙ** / Running badge | S |
| J-L01 | Library | Dashed tip «Συμβουλή» chrome | S |
| J-L02 | Library | Replace search ✕ with Phosphor X | S |
| J-A01 | Analytics | Warm sepia heatmap under warm-sand / light | S |

---

## 6. Sprint J-2 (shipped)

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| J-D05 | Shell top bar: dense h-12, utility analytics/calendar icons, Study Space + Start Session CTAs | P3 | Done |
| J-T02 | Create Plan → `SecondaryCTA` (session launchers remain primary actions) | P3 | Done |
| J-A02 | Retention curve theme stroke + Σήμερα / +14ημ. markers; FSRS day-plus i18n | P2 | Done |
| J-X01 | Density: PageHeader, StatTile, ProgressKpiRow, FSRS/MetricCard values | P3 | Done |
| J-X02 | `--color-warm-ink` on light/warm-sand/dark/blueprint; dark color-scheme parity | P2 | Done |

### Theme parity checklist (J-X02)

| Token / surface | Warm light / warm-sand | Dark / blueprint |
| --------------- | ---------------------- | ---------------- |
| `--color-warm-ink` | `#5c4033` | `#8a6f55` |
| Page cream scope | `warmSandScopeProps` on Dashboard/Tasks/Library/Analytics | No override (root theme) |
| Heatmap sepia | Light-family only (J-A01) | Brand ramp |
| Retention stroke | `var(--color-brand-600)` | Same token (resolves per theme) |
| Shell CTAs | brand-700 fill / brand border | Same tokens |

---

## 7. Security

- Never commit `.env`, live keys, Google client secrets, JWT secrets, user dumps.  
- Only `*.env.example` placeholders.  
- Push target: **Animus1991/synaptic_new** · **feat/mockup-implementation** only (not `origin` arena-archive91).

---

## 8. Acceptance (Wave J-1)

- [x] Dashboard hero order: greeting → 5 KPI → workspace resume → 4-chip actions
- [x] Active topic pill when workspace live has concept
- [x] Hub chip labels short (Calendar/Upload/Session/Workspace compact)
- [x] Tasks running badge reads ΤΡΕΧΕΙ / RUNNING (uppercase chip)
- [x] Library tip dashed + search clear uses icon
- [x] Analytics heatmap sepia on warm-sand/light
- [x] No emoji chrome; tools intact; no secrets in commit

**Shipped:** Wave J Sprint J-1 (2026-07-16) on `feat/mockup-implementation`.

## 9. Acceptance (Wave J-2)

- [x] Shell top bar denser; utility icons + Study Space + Start Session (no emoji)
- [x] Create Plan secondary visual weight
- [x] Retention curve day markers (Today / +14d · Σήμερα / +14ημ.)
- [x] Global KPI/header density reduced (no oversized text-xl heroes)
- [x] Warm light + dark warm-ink / color-scheme parity
- [x] Tools intact; no secrets in commit

**Shipped:** Wave J Sprint J-2 (2026-07-16) on `feat/mockup-implementation`.
