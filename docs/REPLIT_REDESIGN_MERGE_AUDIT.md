# Replit-redesign merge audit (2026-07-24)

Objective review of `origin/replit-redesign` (`822074c`) vs `origin/main` (`ff801b8`)
and tip `cursor/ai-tool-intelligence-2ff7`.

## Verdict

**Blind merge is not possible and not desirable.**

| Fact | Evidence |
| --- | --- |
| Unrelated histories | `git merge-base origin/main origin/replit-redesign` → empty; different root SHAs |
| Different product shape | Replit = pnpm monorepo (`artifacts/synapse`, `artifacts/api-server`, `lib/*`); main = single Vite app (`src/`, `server/`) |
| Force-updated tip | `822074c` (removed Replit-only tracking noise after large “prior to merge” dump) |
| Toolchain | Replit: vite **7.3.5**, esbuild **0.27.3**, react **19.1.0**. Main/tip: vite **7.3.6**, esbuild **0.28.1**, react **19.2.6** |

`--allow-unrelated-histories` would invent a fake common root and collide `src/` vs `artifacts/synapse/src/`. Rejected.

`git pull` of `main` into the working tip: **already up to date**.

## What replit is better at (portable)

1. **Unicode/Greek-aware debate counters** (`debateCounterArgs.ts`) — `\b` never matches Greek; replit uses `\p{L}` lookarounds + kind labels.
2. **Reader `ask-ai-inline`** — quick explanation stays in Reader (gated by real `isLlmAvailable` on tip; replit always-on LLM is platform-tied).
3. **Same-origin `/api` defaults + Replit AI Integrations** — valuable **only** on Replit hosting; not portable without their `routes/ai.ts` + secrets.

## What main / tip is better at

1. OPT-AI A–D tool intelligence (router, offline heuristics, Library/Analytics/Teacher/Settings).
2. OPT-K74/K75 mobile notebook clarity.
3. Honest LLM gating (no silent “available” without key/proxy).
4. Newer vite/esbuild/react pins (CVE path already on main).
5. Canonical CI/docs history; `docs/upstream` on replit is a frozen main@K73 snapshot (no K74/AI-06).

## Explicitly not ported

- Whole monorepo / `artifacts/mockup-sandbox` / `@replit/vite-plugin-*`
- Always-true `isLlmAvailable` + `BUILTIN_PROXY='/api/ai'`
- Hardcoded `gpt-5.6-luna` / `AI_INTEGRATIONS_OPENAI_*`
- Older vite/esbuild pins
- Soft-fail production boot as default
- Ad-hoc per-panel `chatCompletion` buttons superseded by tip OPT-AI
- Dashboard Daily Brief (optional later; risks first-viewport clutter vs proactive alerts)

## Actions taken on tip

1. Pulled `main` (noop — already current).
2. Ported **debateCounterArgs** Unicode/kind model + ArgumentMap consumers + tests.
3. Ported **Reader ask-ai-inline** via selection contract + `CognitiveReader`, gated by `isLlmAvailable(userSettings)` and passing settings into `chatCompletion`.
4. Documented this audit; left Replit platform adapter items out of mainline.

## Frontend / UI / UX / aesthetic pass (follow-up)

Exhaustive remapped hash compare of `artifacts/synapse/src/{components,styles,index.css,App.tsx}` vs tip:

| Metric | Result |
| --- | --- |
| Compared UI files | 299 |
| Byte-identical | 265 |
| Content differ | 34 |
| Only on replit | **0** |

### Differing files — UI decision matrix

| Surface | Replit Δ | Decision |
| --- | --- | --- |
| Landing / Shell / `components/ui/*` | Identical (1 test casing) | nothing |
| `StudyWorkspaceChrome` / Agent K74–K75 / CSS | Tip **ahead** | keep tip |
| Dashboard empty 3-step Cards + Daily Brief | denser marketing + AI strip | **SKIP** (clutter / tip density) |
| Debate/Compare/Leitner/Simulator/Timer/Scratchpad/Feynman/ConceptMap | ad-hoc Sparkles AI CTAs | **SKIP** (OPT-AI supersedes; some remove tip chrome) |
| Whiteboard learner-coverage UI | present in coach but **unwired** in replit `WhiteboardPanel` | **SKIP** (dead UI) |
| CourseView / Tasks | noop `setTab` rewrite | **SKIP** |
| Reader complexity heatmap | `estimateDifficulty` 3-tier vs word-count>25 | **PORTED** |
| Reader annotation swatches | `h-5` + `aria-label` | **PORTED** |
| ask-ai-inline / Unicode debate counters | — | already ported earlier |

### Conclusion (UI)

After this pass there are **no remaining high-value portable UI cherry-picks** from `replit-redesign`. Tip remains SSoT for aesthetics (Minimal/Primer, K74/K75, OPT-AI affordances).

## Actions taken on tip (cumulative)

1. Pulled `main` (noop — already current).
2. Ported **debateCounterArgs** Unicode/kind model + ArgumentMap consumers + tests.
3. Ported **Reader ask-ai-inline** (LLM-gated).
4. Ported **Reader complexity heatmap** (`estimateDifficulty` 3-tier) + larger annotation swatches with `aria-label`.
5. Documented both AI/platform and frontend/UI audit passes.

## Recommendation going forward

Treat `replit-redesign` as a **feature/idea source**, not a merge source. Continue tip as SSoT. If Replit hosting is required later, add an optional adapter package — do not replace the mainline tree.
