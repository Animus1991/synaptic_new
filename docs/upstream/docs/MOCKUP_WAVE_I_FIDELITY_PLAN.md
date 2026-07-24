# Wave I — Mockup screenshot fidelity (post H+)

**Date:** 2026-07-16  
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only  
**Inputs:** 10 Replit canvas screenshots (Dashboard×3, Tasks×2, Library×2, Analytics×3)  
**Non-negotiables:** 100% tool functionality · denser type than Replit · **no emojis** · Phosphor/line icons · warm light + dark first-class · no secrets/PII in commits · merge best of production + canvas (no wholesale replacement)

**Companions:** [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md), [`GAP_AUDIT.md`](./GAP_AUDIT.md), [`MOCKUP_MERGE_AUDIT_AND_PLAN.md`](./MOCKUP_MERGE_AUDIT_AND_PLAN.md)

---

## 1. Method

| Step | Action |
| ---- | ------ |
| 1 | Inventory every visible chrome block in each screenshot |
| 2 | Diff against production after Wave G + H+ (`8c5be47`) |
| 3 | Prefer production data wiring; reshape chrome only |
| 4 | Ship Sprint I-1 (P1) fully; track I-2/I-3 without omission |
| 5 | Secret-scan; push only `synaptic_new` `feat/mockup-implementation` |

**Density contract:** H1 ≈ 18–20px · section labels 11–13px uppercase · cards `p-3`/`p-4` · KPI `text-xl` · zero emoji chrome.

---

## 2. Already shipped (do not redo)

Wave A–G + H-01…H-05: hub CTAs, stats, warm-sand, Tasks dual strip, Library RAG/NotebookLM, Analytics tabs/KPI/Visual Lab prefs, 3-col dashboard toggle, combined-study panel, TOOL-RD-03, AI-05 NotebookLM strategy.

---

## 3. Must not remove

- All workspace tools, Concept Bus, Agent inline, MCP, Research tab  
- Hub popups (calendar / wallpaper / personal dates / reviews)  
- Kanban strip, proactive alerts, smart CTAs (reshape only)  
- Blueprint global theme (scoped cream fidelity only)

---

## 4. Sprint I-1 (this wave — P1)

| ID | Surface | Item | Status |
| -- | ------- | ---- | ------ |
| I-D01 | Dashboard | Move coverage / exam calendar / next steps into right rail | **shipped** |
| I-D02 | Dashboard | 2×2 semantic alert grid (exam / quiz / forget / misconception) | **shipped** |
| I-D04 | Dashboard | Primary **Εκτέλεση** CTA on next-action | **shipped** |
| I-D05 | Dashboard | Pair readiness + compact coverage in Col A | **shipped** |
| I-D06 | Dashboard | FSRS horizon buckets (today / tomorrow / 3d) | **shipped** |
| I-D08 | Dashboard | Dual secondary prompts side-by-side | **shipped** |
| I-T01 | Tasks | Session launchers above tabs (mockup order) | **shipped** |
| I-L01 | Library | Combined-study promo strip + Επιλογή expand | **shipped** |
| I-L02 | Library | Stats strip N courses / N files | **shipped** |
| I-L03 | Library | Explicit Άνοιγμα + Shell on course cards | **shipped** |
| I-A01 | Analytics | Overview 3-col: Courses \| Concepts \| You vs Real | **shipped** |
| I-A02 | Analytics | Overview section order (KPI → ring → FSRS → trends → 3-col → flow → lab) | **shipped** |
| I-A04 | Analytics | Replace unicode chrome with Phosphor icons | **shipped** |
| I-X01 | Theme | Scoped cream fidelity note + light acceptance path | **shipped** (doc) |

---

## 5. Sprint I-2 / I-3

| ID | Item | Priority | Status |
| -- | ---- | -------- | ------ |
| I-D03 | Hub compact 4-chip quick actions (+ overflow More) | P2 | **shipped** |
| I-D07 | Sticky page title chrome (`PageHeader`) | P2 | **shipped** |
| I-D09 | SectionLabel density pass (Dashboard) | P3 | **shipped** |
| I-D10 | Deduplicate workspace resume (hub only) | P3 | **shipped** |
| I-T02 | Δημιούργησε Πλάνο CTA | P2 | **shipped** |
| I-T03 | Weak-area trend colors (emerald / rose / muted) | P2 | **shipped** |
| I-T04 | Due review interval badge | P2 | **shipped** |
| I-L04–L08 | Corner badges, generating lock, topic chips, +Αρχείο, X delete | P2–P3 | **shipped** |
| I-A03 | FSRS day labels under bars (Today / Tomorrow / +3/+7/+14) | P2 | **shipped** |
| I-X03 | Shared SectionLabel adoption | P3 | **shipped** |

---

## 6. Security

- Never commit `.env`, live keys, Google client secrets, JWT secrets, user dumps.  
- Only `*.env.example` placeholders.  
- Push target: **Animus1991/synaptic_new** · **feat/mockup-implementation** only.

---

## 7. Acceptance (Wave I-1)

- [x] Dashboard right rail matches mockup IA (coverage + calendar + queue buckets)
- [x] 2×2 alert grid visible when data present
- [x] Tasks: sessions → tabs → insights → list
- [x] Library: promo strip, stats, Open+Shell
- [x] Analytics Overview rhythm + 3-col mastery row
- [x] No emoji chrome; tools intact; no secrets in commit

---

## 8. Acceptance (Wave I-2 / I-3)

- [x] Hub shows compact 4 chips; reviews / dates / wallpaper in overflow
- [x] Page headers sticky with backdrop
- [x] Dashboard uses shared `SectionLabel`; no duplicate workspace resume
- [x] Tasks: Create Plan CTA; weak trend colors; review interval chips
- [x] Library cards: corner badges, generating lock, topic chips + add file, X delete
- [x] Analytics FSRS bars: selective day labels
- [x] No emoji chrome; tools intact; no secrets in commit
