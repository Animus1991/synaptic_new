# Synaptic-Refined → Synapse-Learning — Merge Audit & Forward Upgrade Plan

> **Audit date:** June 2026  
> **Upstream:** [Animus1991/synaptic-refined](https://github.com/Animus1991/synaptic-refined) · branch `main` @ `ef06b0a`  
> **Downstream (ours):** `synapse-learning` / `synaptic_new` · branch `main` @ post Wave 8B-β v2.5.1  
> **Note:** Branch `lovable1` does **not** exist on `synaptic-refined`; only `main` was audited.

---

## 1. Executive summary

| Dimension | synaptic-refined | synapse-learning (ours) | Merge outcome |
| --------- | ---------------- | ----------------------- | ------------- |
| Git tracked files | 664 | 649 (+18 upstream-only) | **130 files ported** from refined |
| Content pipeline | v2.2.x baseline | **v2.5.1** (spell gate, Varian Ch31, layered repair) | **Ours kept** — not overwritten |
| Study Workspace boot | `StudyWorkspaceLazy` + retry | Same + **importWithRetry** + chunk reporter | **Merged** |
| Chunk resilience | `lazyWithRetry`, Sentry hooks, E2E | Was missing | **Ported** |
| Visual system | Warm Sand + Phosphor thin icons + editorial fonts | Lucide-only | **Ported** |
| Embeddings | `@huggingface/transformers` v4 | `@xenova/transformers` v2 | **Upgraded** to HF v4 |
| a11y / observability | axe Playwright, Sentry dashboard JSON | Partial | **Ported** |

**Principle applied:** *Refined upgrades are additive.* Where our tree is strictly ahead (OCR pipeline, Varian fixtures, CognitiveReader live repair), those files were **excluded** from overwrite.

---

## 2. Repository diff inventory (exhaustive)

### 2.1 Files ONLY in synaptic-refined (ported ✅)

| Path | Purpose |
| ---- | ------- |
| `.github/ISSUE_TEMPLATE/chunk-error.yml` | GitHub issue template for chunk-load failures |
| `.lovable/project.json` | Lovable host metadata |
| `STUDY_WORKSPACE_REARCHITECTURE_PLAN.md` | Shell + lazy panels re-architecture plan |
| `docs/observability/sentry-chunk-errors.md` | Sentry wiring guide for chunk errors |
| `docs/observability/sentry-dashboard.synapse-chunk-health.json` | Importable Sentry dashboard |
| `e2e/a11y-lesson-dock.spec.ts` | axe-core lesson dock a11y |
| `e2e/a11y-multi-viewport.spec.ts` | Responsive a11y sweep |
| `e2e/a11y-workspace-panels.spec.ts` | Workspace panel a11y |
| `e2e/chunk-failure-flows.spec.ts` | Chunk failure user flows |
| `e2e/chunk-failure-recovery.spec.ts` | Retry / reload recovery |
| `public/llms.txt` | LLM crawler hints |
| `public/robots.txt` | SEO robots |
| `public/sitemap.xml` | SEO sitemap |
| `src/lib/chunkErrorReporter.ts` | Central chunk-error telemetry |
| `src/lib/lazyWithRetry.ts` | Exponential-backoff dynamic import |
| `src/lib/lucide-shim.ts` | Phosphor icons under Lucide names |
| `src/lib/preloadCriticalChunks.ts` | Idle prefetch for lazy overlays |

### 2.2 Files ONLY in synapse-learning (retained ✅)

| Path | Why kept |
| ---- | -------- |
| Wave 8B-β pipeline modules | `documentTextPipeline`, `spellGate`, `varianCh31Fixtures`, `textSanitizer`, etc. |
| `e2e/helpers/onboarding.ts`, `quizSession.ts` | Our E2E helpers |
| `e2e/quiz-workspace-flow.spec.ts` | Quiz E2E package |
| `package-lock.json` | npm lock (refined uses `bun.lock`) |

### 2.3 Files intentionally NOT overwritten (ours ahead)

```
src/lib/documentTextPipeline.ts (+ test)
src/lib/varianCh31Fixtures.ts (+ test)
src/lib/spellGate.ts, spellLexicon.ts, miniSymSpell.ts, viterbiWordSegment.ts
src/lib/latinTextRepair.ts, textSanitizer.ts (+ test), presentationSanitizer.ts
src/lib/paragraphLangDetect.ts, textQualityMetrics.ts (+ test)
src/lib/greekTextRepair.ts (+ test), greekOcrFixtures.ts
src/lib/bilingualOcrEnsemble.ts, courseSourceQuality.ts
src/lib/pipelineConstants.ts (2.5.1), pipelineMigration.ts
src/lib/ocrExtract.ts (+ test), utf8MojibakeRepair.ts, textSegmentation.ts
src/components/workspace/CognitiveReader.tsx
CHANGELOG.md, CONTENT_PIPELINE.md, ROADMAP.md (local Wave 8B-β baseline)
```

### 2.4 Bulk-ported differing files (105 UI / infra)

All other differing tracked files (~105) were copied from refined, including:

- **Shell & pages:** `App.tsx`, `Dashboard`, `Library`, `CourseView`, `Landing`, `Onboarding`, `Settings`, …
- **Workspace (except CognitiveReader):** all 13 tools, boot shell, lazy gate, strips, banners
- **Infra:** `main.tsx`, `index.css`, `index.html`, `vite.config.ts`, `vite-env.d.ts`, `tsconfig.json`, `.github/workflows/ci.yml`
- **Lib:** `localEmbedder.ts` (HF transformers), `workspaceToolRegistry`, `workspaceToolS20Spine`, QA strips

---

## 3. What changed functionally (merge slice)

### 3.1 Chunk load resilience (P0)

- `lazyWithRetry` wraps all `React.lazy` overlays (Agent, Analytics, Lesson, …).
- `loadStudyWorkspaceModule` uses `importWithRetry` with stale-chunk hard reload (once per session).
- `StudyWorkspaceLazy` adds **Try again** + **Reload** on boot shell errors.
- `chunkErrorReporter` emits `synapse:chunk-error`, optional Sentry + `/__chunk_errors` beacon.
- `preloadCriticalChunks()` at app boot (staggered idle prefetch).
- `__APP_VERSION__` injected in Vite for triage.

### 3.2 Visual / UX system (P0)

- **Phosphor thin** icons via `@/lib/lucide-shim` (global swap, no per-file Lucide edits).
- **Editorial typography:** Playfair Display, Lora, Nunito Sans, JetBrains Mono (`@fontsource/*`).
- **Warm Sand theme:** `data-ws-theme="warm"` on `<html>`, updated `index.css` tokens.
- Intelligence panels / context strips aligned with refined de-clutter pass.

### 3.3 Embeddings upgrade

- `@xenova/transformers` → `@huggingface/transformers@^4.2.0` with `dtype: 'q8'`.
- Same model: `Xenova/all-MiniLM-L6-v2`.

### 3.4 Testing & CI

- New scripts: `test:a11y`, `test:e2e:chunk-recovery`, `build:dev`.
- DevDeps: `@axe-core/playwright`, `axe-core`.
- E2E chunk + a11y specs from refined.

### 3.5 SEO / ops

- `public/robots.txt`, `sitemap.xml`, `llms.txt`.
- Sentry dashboard JSON + chunk-error issue template.

---

## 4. Forward upgrade plan (aligned with synaptic-refined direction)

This plan extends refined's `STUDY_WORKSPACE_REARCHITECTURE_PLAN.md` and `PRODUCT_UPGRADE_MASTER_PLAN.md` while **preserving** our Wave 8B-β pipeline lead.

### Phase A — Stability & observability (2–3 weeks) ✅ *mostly merged*

| ID | Item | Acceptance | Status |
| -- | ---- | ---------- | ------ |
| A1 | Chunk retry + stale reload | E2E `chunk-failure-recovery` green | ✅ Merged |
| A2 | Boot shell error UX | User sees Try again / Reload, not infinite spinner | ✅ Merged |
| A3 | Sentry chunk dashboard | Import JSON; verify `synapse:chunk-error` events | 🔲 Wire in prod |
| A4 | `__chunk_errors` endpoint | Server route or CF worker receives beacons | 🔲 Not started |
| A5 | a11y CI gate | `npm run test:a11y` in GitHub Actions | 🔲 Add to ci.yml |

### Phase B — Study Workspace re-architecture (4–6 weeks) 🔲 *from refined plan*

**Goal:** TTI ≤ 400 ms warm / ≤ 1.2 s cold; zero feature regressions.

| ID | Item | Detail |
| -- | ---- | ------ |
| B1 | **WorkspaceProvider** context | Single bus for focus, correlation, source intelligence — kill prop drilling |
| B2 | **Shell + Outlet** split | `StudyWorkspace.tsx` < 300 lines; each tool lazy-loaded |
| B3 | **Virtualised StepRail** | No synchronous PMI/BM25 on mount |
| B4 | **One strip rule** | Max 1 contextual strip + 1 tool surface visible |
| B5 | **Deferred intelligence** | SourceIntelligence, ConceptBus, Discoverability compute on tab open |
| B6 | Perf budget tests | Playwright trace + `performance.mark` for Continue → interactive |

Reference: `STUDY_WORKSPACE_REARCHITECTURE_PLAN.md` §2–§5.

### Phase C — Content pipeline depth (3–4 weeks) 🔲 *ours leads; refine upstream*

| ID | Item | Detail |
| -- | ---- | ------ |
| C1 | **Hunspell / larger lexicon** | Extend `spellLexicon` with `.dic` import path |
| C2 | **Column-aware PDF** | Integrate refined Reader layout fixes if any delta remains |
| C3 | **Reprocess at scale** | Fix flaky `pipelineReprocess` Vitest under parallel |
| C4 | **Quality banner v2** | Show hygiene + corruption score from `textQualityMetrics` |
| C5 | **Varian regression CI** | Gate on `varianCh31Fixtures.test.ts` in CI |

### Phase D — Page-level product polish (4–5 weeks) 🔲 *from PRODUCT_UPGRADE_MASTER_PLAN*

| Page | Priority changes |
| ---- | ---------------- |
| Library | Delete/reprocess from Files tab; outline preview on card |
| CourseView | Destructive delete lists derived artifacts |
| Dashboard | Real activity feed events; exam countdown → workspace timer |
| Onboarding | Upload → workspace explainer; teacher → TeacherDashboard hint |
| Landing | Greek PDF / reprocess value prop |
| Settings | Pipeline version + reprocess shortcut |

### Phase E — Platform scale (8–12 weeks) 🔲 *unchanged long arc*

| ID | Item |
| -- | ---- |
| E1 | Server RAG persistence + org metering |
| E2 | User-authored notes MVP |
| E3 | Full i18n (analytics, feynman, argument labels) |
| E4 | Teacher roster + multi-tenant hardening |
| E5 | Offline embedding worker (optional Web Worker) |

### Phase F — Design system consolidation (2–3 weeks) 🔲 *partially merged*

| ID | Item |
| -- | ---- |
| F1 | Document Warm Sand tokens in `PLATFORM_UI_UX_MASTER_PLAN.md` |
| F2 | Remove dead Lucide package once shim coverage verified |
| F3 | Tablet breakpoints audit (a11y multi-viewport spec as gate) |
| F4 | Empty states + resume card (Package C from prior roadmap) |

---

## 5. Sync procedure (repeatable)

```bash
# One-time
git remote add synaptic_refined https://github.com/Animus1991/synaptic-refined.git
git fetch synaptic_refined main

# Compare
git diff synaptic_refined/main --stat

# Never blindly merge — use keep-local list from §2.3
```

**Recommended cadence:** weekly `git fetch synaptic_refined` + diff stat; port additive infra/UI; never downgrade pipeline version.

---

## 6. Verification checklist (post-merge)

- [ ] `npm install && npm run typecheck:all`
- [ ] `npm test` (700+ Vitest)
- [ ] `npm run test:e2e:chunk-recovery`
- [ ] `npm run test:a11y`
- [ ] `npm run build`
- [ ] Manual: Continue → workspace < 5 s cold
- [ ] Manual: Greek Reader still runs `repairDisplayPipeline()` live
- [ ] Manual: Reprocess shows pipeline **v2.5.1**

---

## 7. Risk register

| Risk | Mitigation |
| ---- | ---------- |
| HF transformers v4 bundle size | Lazy load only in embedder; monitor vendor chunk |
| Phosphor shim missing icon | Add to `lucide-shim.ts`; TypeScript will surface at import |
| Refined overwrites pipeline on future sync | Enforce §2.3 keep-local list in merge script |
| a11y regressions | Run `test:a11y` before release |

---

*Generated as part of synaptic-refined → synapse-learning exhaustive merge audit.*
