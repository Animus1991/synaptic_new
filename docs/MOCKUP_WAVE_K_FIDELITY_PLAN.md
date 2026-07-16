# Wave K — Theme parity (spectrum/blueprint) + remaining canvas polish

**Date:** 2026-07-16  
**Branch:** `feat/mockup-implementation` → `https://github.com/Animus1991/synaptic_new.git` only  
**Inputs:** Replit canvas screenshots (post Wave J) · user preference: warm light + dark first-class · upgrade **all** themes without wiping identity  
**Non-negotiables:** 100% tool functionality · denser type · **no emoji / unicode chrome arrows** · Phosphor icons · no secrets/PII · merge production + canvas

**Companions:** [`MOCKUP_WAVE_J_FIDELITY_PLAN.md`](./MOCKUP_WAVE_J_FIDELITY_PLAN.md), [`MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`](./MOCKUP_SCREENSHOT_FIDELITY_PLAN.md)

---

## 1. Method

| Step | Action |
| ---- | ------ |
| 1 | Diff Wave J tip vs remaining screenshot chrome + theme matrix |
| 2 | Fix theme scope bugs that collapse spectrum into warm-sand |
| 3 | Ship Sprint K-1 (P1) fully; track K-2 without omission |
| 4 | Secret-scan; push only `synaptic_new` `feat/mockup-implementation` |

---

## 2. Already shipped (do not redo)

Wave A–J: dashboard hero IA, hub chips, Create Plan secondary, shell utilities, retention markers, warm-ink light/dark, sepia heatmap under light.

---

## 3. Must not remove

- Workspace tools, Agent, MCP, Research, Visual Lab, hub popups  
- Spectrum vibrant identity · Blueprint glass dark identity  
- Warm light cream pages · Dark editorial contrast  

---

## 4. Gaps → Sprint K-1

| ID | Gap | Fix |
| -- | --- | --- |
| **K-T01** | `warmSandScopeProps(isLight)` applies warm-sand under **spectrum**, wiping purple light theme on Dashboard/Tasks/Library/Analytics | Scope warm-sand **only** when root `data-theme="light"` |
| **K-T02** | Heatmap sepia also under spectrum (wrong family) | Sepia only for `light` / nested `warm-sand` |
| **K-T03** | Spectrum missing `--color-warm-ink` + explicit `color-scheme` | Add spectrum warm-ink + light color-scheme |
| **K-A01** | Calibration buckets are vertical qualitative 4-row; mockup is dense horizontal 5-bin (% · range · n=) | Rebuild bucket model + horizontal chrome |
| **K-X01** | Tasks insight CTAs use unicode `→` | Phosphor `ArrowRight` |
| **K-X02** | Residual oversized greeting / shell brand type | Density pass |

### Theme matrix (target)

| Theme | Page cream scope | Heatmap | warm-ink |
| ----- | ---------------- | ------- | -------- |
| light | warm-sand nest | sepia | `#5c4033` |
| warm-sand | (self) | sepia | `#5c4033` |
| spectrum | **none** (keep lavender) | brand ramp | spectrum ink |
| dark | none | brand ramp | `#8a6f55` |
| blueprint | none | brand ramp | `#8a6f55` |

---

## 5. Sprint K-2 (tracked)

| ID | Item | Priority |
| -- | ---- | -------- |
| K-S01 | Settings theme picker denser labels / icons | P3 |
| K-A02 | You-vs-Real calibration labels polish (already mostly done) | P3 |
| K-X03 | Agent / CourseView density pass (out of canvas screenshots) | P3 |

---

## 6. Security

- Never commit `.env`, live keys, Google secrets, JWT secrets, user dumps.  
- Push: **Animus1991/synaptic_new** · **feat/mockup-implementation** only.

---

## 7. Acceptance (Wave K-1)

- [x] Spectrum pages keep spectrum surfaces (not forced warm-sand)
- [x] Sepia heatmap only on light/warm-sand
- [x] Spectrum has warm-ink + color-scheme
- [x] Calibration chart horizontal 5-bin with n=
- [x] No unicode → in Tasks insight CTAs
- [x] Greeting / shell brand denser
- [x] Tools intact; no secrets in commit

**Shipped:** Wave K Sprint K-1 (2026-07-16) on `feat/mockup-implementation`.
