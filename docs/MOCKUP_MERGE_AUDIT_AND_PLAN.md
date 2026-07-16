# Mockup merge audit & upgrade plan (local Synapse)

**Source branch:** `Animus1991/synaptic_new` → `feat/mockup-implementation` (`ab8109e`)  
**Local target:** `synapse-learning` (this repo)  
**Canonical mockup plan (imported):** [`MOCKUP_IMPLEMENTATION_PLAN.md`](./MOCKUP_IMPLEMENTATION_PLAN.md) (Waves A–F)  
**Reconciled:** 2026-07-16  
**Constraints (chat + screenshots):** keep 100% tool functionality · denser type/components than Replit · no emojis · Phosphor/line icons · full-width main · no panel overlap · prefer warm light + dark · no secrets in commits

---

## 1. Security audit (objective)

| Check | Result |
| ----- | ------ |
| Tracked `.env` / real keys on `feat/mockup-implementation` | **Clean** — no tracked env secrets |
| Tracked `.env` on local `HEAD` | Only `*.env.example` (placeholders like `sk-replace-me`) |
| `git grep` for live `sk-…` / Google API keys / private PEMs | **No matches** in tracked source |
| Local `server/.env` / `synaptic_new/server/.env` | **Untracked** (correct). Do not commit. Replace literal `...` Google placeholders with real Console values locally only. |
| Prior Wave 0 note | Empty/localhost proxy key in old history — not a live secret; do not rewrite history unless a non-empty secret appears |

**Rule going forward:** never commit `GOOGLE_CLIENT_*`, `OPENAI_API_KEY`, JWT secrets, or user PII dumps.

---

## 2. What the remote branch adds (vs local)

| Area | Remote (`feat/mockup-implementation`) | Local (ahead on tools Wave 0–2) |
| ---- | ------------------------------------- | -------------------------------- |
| Docs | Full Waves A–F mockup→production plan | Gap/audit for tools; **now imports mockup plan** |
| Artifacts | `artifacts/mockup-sandbox` (Replit canvas) + `artifacts/synapse` UI sketches | Not present (intentionally — port ideas, not sandbox) |
| Tools depth | Older baseline on some Wave 2 SM/PR items | **Ahead:** SM-02/03, PR-02/03, CM/RD/MD/XTL ships |
| UI density | Mockups show larger type / airy cards | User wants **denser** merge of both |

**No shared merge-base** between `synapse-learning` and `synaptic_new` histories — port by **file/idea transplant**, not `git merge`.

---

## 3. UI/UX merge principles (both worlds)

**Keep from production (local):**
- Full workspace tool surface, Concept Bus, Progress export, simulator presets, OAuth routes, i18n, tests
- Stacked dashboard hub (no side-panel stretch/overlap) — already fixed
- `platform-page` full width beside sidebar

**Adopt from mockups (remote + screenshots):**
- Clear section rhythm: sticky compact page chrome, stats row, resume strip, 2-col main + right rail
- Semantic color chips (emerald/amber/rose/violet) for risk / quality / priority
- Library quality/status badges, Tasks session “ΠΡΟΤΕΙΝΕΤΑΙ”, Analytics tab clarity
- Warm Sand token scope for Tasks when light/warm

**Override vs raw Replit:**
- H1 ≈ 18–20px (not oversized serif hero)
- Meta/badges 9–11px; section labels 11–13px uppercase
- Card padding `p-3`/`p-4` default (not `p-6` everywhere)
- **Zero emoji** — replace greeting `Hand` with time-of-day Phosphor icon (`Sun` / `Moon` / `CloudSun`)

---

## 4. Wave status (local adaptation)

| Wave | Scope | Status |
| ---- | ----- | ------ |
| **A** | `SectionLabel`, compact progress, status/quality badges | **Done** |
| **B** | Dashboard density + time-of-day icons (no emoji) + compact stats | **Done** |
| **C** | Library badges + filter/view localStorage persist + denser cards | **Done** |
| **D** | Tasks ΠΡΟΤΕΙΝΕΤΑΙ + warm-sand scope + priority left-border | **Done** |
| **E** | Analytics denser spacing (data pipes unchanged) | **Partial** — spacing/density; deeper chart widgets later |
| **F** | a11y / contrast / reduced-motion | Planned |
| **Tools** | Wave 3 OCR/collab | Separate — after UI waves stabilize |

---

## 5. Acceptance (merge)

- [ ] No regression in workspace tools (quiz, leitner, reader, simulator, whiteboard, timer, progress)
- [ ] Dashboard / Tasks / Library / Analytics readable at full main width, dense gaps
- [ ] No emoji in primary chrome
- [ ] Warm light + dark remain first-class; other themes still boot
- [ ] No secrets in commits / PRs

---

## 6. Non-goals

- Do not replace production `Dashboard.tsx` wholesale with `artifacts/synapse` sketch (loses props/tooling).
- Do not vendor entire `mockup-sandbox` shadcn tree into app.
- Do not force-push or rewrite remotes for hygiene unless a live secret is confirmed.
