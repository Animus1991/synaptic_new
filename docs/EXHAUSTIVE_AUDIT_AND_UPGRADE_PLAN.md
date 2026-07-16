# Exhaustive audit & upgrade plan — Synapse Learning

**Date:** 2026-07-15  
**Scope:** Local `synapse-learning` + remotes `Animus1991/synaptic-refined`, `Animus1991/synaptic_new`  
**Method:** Code/docs/security review against `PRODUCT_SCALE_STATUS.md`, `docs/GAP_AUDIT.md`, `SECURITY.md`, Google OAuth surface, and git history of pushed commits.  
**Constraint:** Preserve full Google tooling (OAuth sign-in/connect, Tasks, Meet, Calendar). No secrets/PII in repos.

This document is the **execution ledger**. Close rows in `docs/GAP_AUDIT.md` when implemented; keep this file as the phased roadmap.

---

## 1. Executive verdict

| Dimension | Assessment |
| --------- | ---------- |
| Product maturity | High — ~product-scale per STATUS; majority of GAP rows already **shipped** |
| Type safety | `npm run typecheck` **passes** (2026-07-15) |
| Google tooling | **Intact** — server routes `/auth/google/*`, `/v1/google/tasks`, Meet spaces, Calendar events; client `googleClient.ts` + `GoogleIntegrationsPanel` |
| Security (pushed history) | **No live API keys** found. Policy issue: `.env.local` was tracked in `5235592` (empty key + localhost URL) — remediated |
| Remaining work | Mostly **P2 tool depth**, enterprise ops stubs, doc drift, multi-instance Google token store |

**Honest scope note:** Implementing every open P2/P3 item (OCR re-anchor, SymPy, LTI AGS production, MCP SSE, collaborative whiteboard CRDT, etc.) is multi-sprint work. This plan sequences them; Wave 0–1 are executed in the accompanying commits.

---

## 2. Architecture snapshot

| Layer | Path | Role |
| ----- | ---- | ---- |
| Client SPA | `src/` (Vite + React + Zustand) | Library, Dashboard, Course, Notebook workspace (12+ tools), Agent, Tasks, Analytics, Teacher, Settings |
| API proxy | `server/` (Express) | Auth/JWT, LLM upstream, Google OAuth, Calendar/Tasks/Meet, org/teacher, RAG, billing, admin |
| OCR | `ocr-server/` | Optional extraction service |
| Mobile | `mobile/` | Capacitor + Fastlane scaffolds |
| Docs | 100+ markdown plans | Canonical truth: `PRODUCT_SCALE_STATUS.md` + `docs/GAP_AUDIT.md` |

---

## 3. Google tooling inventory (must not regress)

| Capability | Client | Server | Scopes |
| ---------- | ------ | ------ | ------ |
| Sign-in | `googleAuthStartUrl` / `completeGoogleAuth` | `routes/googleAuth.ts` | openid email profile |
| Connect integrations | `googleConnectStartUrl` | same + token store | + tasks, Meet space create, calendar.events |
| Tasks list/create | `GoogleIntegrationsPanel` | `routes/googleIntegrations.ts` | tasks |
| Meet space | panel + StudyRoom | Meet API | meetings.space.created |
| Calendar upsert/list/delete | `taskCalendarSync` + panel | `routes/googleCalendar.ts` | calendar.events |
| Status / disconnect | `fetchGoogleStatus`, `disconnectGoogle` | token store + lifecycle purge | — |

**Regression gate after any change near auth/proxy:**

```bash
npm run typecheck
cd server && npm test
# Manual: Settings → Google connect → Tasks list → Meet create → Calendar sync a task
```

**Known risk (MCP-03 / ops):** `googleTokenStore.ts` uses in-memory `Map` with Postgres purge helpers elsewhere — multi-replica deployments can lose Google refresh tokens unless Postgres-backed OAuth persistence is completed.

---

## 4. Security & privacy findings

| ID | Severity | Finding | Remediation |
| -- | -------- | ------- | ----------- |
| SEC-01 | P0 policy | `.env.local` committed in `5235592` to synaptic remotes (empty `VITE_OPENAI_API_KEY`, localhost proxy) | Remove from tree; add `.env`/`.env.local` to `.gitignore`; ship `.env.local.example`; push both remotes |
| SEC-02 | P0 prod | `ADMIN_SECRET` missing → any non-anonymous user was admin | Harden: production always 403 without secret; docs updated |
| SEC-03 | P1 | JWT/auth token in `localStorage` | Documented threat; session UX / httpOnly cookies on roadmap |
| SEC-04 | P1 | In-memory Google OAuth tokens | MCP-03 Postgres persistence |
| SEC-05 | Info | No real `sk-` / `AIza` / private keys in git history of synaptic pushes | No key rotation required from scan |
| SEC-06 | Hygiene | `test-results/` partially tracked historically | Keep ignored; do not re-add artifacts |

**PII:** Learner libraries live in IndexedDB/localStorage and server JSONB; compliance docs exist under `docs/compliance/`. No personal emails/names found hardcoded in source for production accounts.

---

## 5. Open gaps (from `docs/GAP_AUDIT.md`) — prioritized backlog

### Wave 0 — Security & hygiene (immediate)

1. SEC-01 env hygiene + push  
2. SEC-02 admin harden  
3. Untrack env; example files only  

### Wave 1 — High-ROI tool depth (this cycle)

| ID | Item |
| -- | ---- |
| TOOL-CM-02 | Concept map **redo** stack |
| TOOL-TM-02 | Auto-suggest Leitner on Pomodoro **break** (wire `onOpenBreakTool`) |

### Wave 2 — Tool correctness / a11y

| ID | Item | Status |
| -- | ---- | ------ |
| TOOL-CM-03 | PMI edge labels | **shipped** (2026-07-15) |
| TOOL-CM-04 | Keyboard a11y + SR tree | **shipped** (2026-07-15) |
| TOOL-RD-02 | Glossary popover (hover) | **shipped** (2026-07-15) |
| TOOL-SM-02/03 | Simulator presets + graph→whiteboard | **shipped** (2026-07-15) |
| TOOL-PR-02/03 | Time-on-tool + PDF progress export | **shipped** (2026-07-15) |
| MD-05 | Image-as-thumbnail | **shipped** (2026-07-15) |
| XTL-03 | Expand RTL component tests | **shipped** (2026-07-15) |

**Wave 2:** closed.

### Wave 3 — Collaboration & OCR depth

| ID | Item | Status |
| -- | ---- | ------ |
| TOOL-RD-04 / TOOL-AN-03 | OCR re-anchor after reprocess | **shipped** |
| TOOL-AN-02 / COL-02 | Annotation conflict UI | **shipped** |
| COL-04 | Collaborative whiteboard shared state | **shipped** |

**Wave 3:** closed (2026-07-16).

### Mockup Wave E — Analytics (parallel track)

| Item | Status |
| ---- | ------ |
| SubjectMasteryGrid + SubjectDrillDown | **shipped** (2026-07-16) |
| StudyBehaviorCharts (CSS/SVG) | **shipped** |
| AIInsightsPanel + `GET /v1/analytics/insights` | **shipped** |
| AnalyticsDateRangeContext (`7d` / `30d` / `semester`) | **shipped** |

### Wave 4 — Platform / enterprise

| ID | Item | Status |
| -- | ---- | ------ |
| MCP-01..03 | MCP SSE, client readers, OAuth Postgres | **shipped** (2026-07-16) |
| OPS-07 | LTI grade passback production AGS | **shipped** |
| PLT-03 | Offline embeddings | **shipped** (localEmbedder + recognition worker) |
| TOOL-SP-02/03 | SymPy + unit checker | **shipped** |
| SRC-08 | Multi-page thumbnail strip | **shipped** |

**Wave 4:** closed (2026-07-16).

### Wave 5 — Documentation single source of truth

| ID | Item | Status |
| -- | ---- | ------ |
| DOC-02..04 | ARCHITECTURE / BLUEPRINT / PRODUCT_SCALE_PLAN drift | **shipped** (2026-07-16) |
| DOC-05 | Keep GAP_AUDIT reconciled each sprint | **shipped** this close-out |

### Wave G — Screenshot fidelity (Replit canvas)

See `docs/MOCKUP_SCREENSHOT_FIDELITY_PLAN.md`. Cream density, warm-sand page scopes, Tasks dual insight banners.

---

## 6. Markdown corpus guidance

There are **100+** plan/status docs. Many predate Option-B/L17 and **conflict** with `PRODUCT_SCALE_STATUS.md`.

**Rule:** Treat only these as authoritative for “what ships”:

1. `PRODUCT_SCALE_STATUS.md`  
2. `docs/GAP_AUDIT.md`  
3. `CHANGELOG.md`  
4. `SECURITY.md` / `docs/compliance/*` / `docs/legal/*`

Mark older masters (`EXHAUSTIVE_*`, `STATE_OF_THE_ART_*`, duplicate upgrade plans) as **historical** in headers when edited; do not invent parallel truth.

---

## 7. Implementation status (this session)

| Item | Status |
| ---- | ------ |
| Remove tracked `.env.local`; gitignore; `.env.local.example` | done |
| Admin production harden | done |
| TOOL-CM-02 redo | done |
| TOOL-TM-02 break→Leitner CTA | done |
| SECURITY.md checklist update | done |
| Wave 2: CM-03/04, RD-02, MD-05, XTL-03 | done |
| Wave 2 remainder: SM-02/03, PR-02/03 | done |
| Push to `synaptic_refined` + `synaptic_new` | ongoing on `feat/mockup-implementation` → `synaptic_new` |
| Wave 3 OCR/collab | done |
| Mockup Wave E Analytics | done |
| Wave 4 platform/enterprise | done |
| Wave 5 docs SoT | done |
| Wave G screenshot fidelity | done |
| Wave H+ deferred rows | see MOCKUP_SCREENSHOT_FIDELITY_PLAN §6 |

---

## 8. Non-goals / explicit protections

- Do **not** strip or narrow Google scopes without product decision.  
- Do **not** rewrite git history unless a **non-empty** secret is found (none found).  
- Do **not** commit `server/.env`, Fastlane secrets, or Sentry auth tokens.  
- Do **not** port Memora (`ai_tutor_studio`) Firebase client keys into Synapse.

---

*Maintainer: update §7 when closing waves; sync IDs into `docs/GAP_AUDIT.md`.*

---

## 9. Audit addendum - 2026-07-17

**Scope:** Follow-up audit pass on the local `synapse-learning` checkout, active branch `feat/mockup-implementation`, all local/remotes refs visible in this clone, current Markdown corpus, security-sensitive env surfaces, baseline tests, and production build.

### 9.1 Verification results

| Gate | Result | Notes |
| ---- | ------ | ----- |
| Client + server typecheck | pass | `npm.cmd run typecheck:all` |
| Client/unit suite | pass | 298 files / 1166 tests |
| Server suite | pass | 39 files / 180 tests after telemetry cold-import fix |
| Production build | pass | `npm.cmd run build`; remaining warnings are chunk-size and mixed static/dynamic `orgClient` import |
| High-confidence secret scan | pass | No AWS/GCP/OpenAI/GitHub/Slack/private-key patterns found across visible refs after excluding generated/vendor bundles |
| Env hygiene | pass with history note | `.env.local`, `server/.env`, `ocr-server/.env`, Fastlane secrets are ignored; historical `.env.local` snapshot had empty API key + localhost URL |
| PII scan | needs policy decision | Commit author emails and some public/test/support email fixtures exist; removing pushed author emails requires coordinated git-history rewrite |

### 9.2 Implemented in this addendum pass

| Area | Change | Why |
| ---- | ------ | --- |
| Server telemetry | Lazy-load OpenTelemetry SDK/exporters only inside `initTelemetry()` | Avoid cold-import test timeout and keep status reads light |
| Server tests | Added a focused cold-import timeout only to telemetry disabled-status test | Prevent false CI failure on slow first module transform |
| CSS build hygiene | Escaped decimal points in warm workspace `.bg-white/[0.04]` and `[0.05]` selectors | Removes Lightning CSS optimizer warning |
| Vitest config | Replaced deprecated `environmentMatchGlobs` reliance with explicit jsdom pragmas on the remaining TSX tests | Removes deprecated test-config warning without changing runtime behavior |
| Anki APKG build hygiene | Hid the Vitest-only `node:module` dynamic import behind a non-literal module specifier | Prevents browser-bundle externalization warning for a test-only path |

### 9.3 Remaining upgrade plan, ordered

| # | Item | Status (2026-07-17 follow-up) |
| - | ---- | ----------------------------- |
| 1 | Credential CI gate (gitleaks) | **shipped** — `.gitleaks.toml` + `.github/workflows/secret-scan.yml`; noted in `SECURITY.md` |
| 2 | Commit author email history rewrite | **blocked — needs explicit approval** (remotes: `origin`, `synaptic_new`, `synaptic_refined`). Not executed. |
| 3 | Public / fixture email review | **shipped (policy pass)** — store metadata already uses `support@` / `privacy@` / `review@synapse-learning.io`; fixed corrupted `first_name.txt`; replaced personal-looking syllabus fixture `nstoupo@econ.uoa.gr` → `instructor@example.edu` in unit + e2e fixtures. Test/example.com addresses retained as fixtures. |
| 4 | Bundle / `orgClient` mixed import | **shipped (safe boundary)** — SAML complete moved to `samlAuthClient.ts`; App lazy-imports that module only. Mermaid/pdf/katex/codemirror already in `vite.config.ts` `manualChunks`. Further index-chunk reduction deferred (risk to tools). |
| 5 | Test log hygiene (`OPENAI_API_KEY`) | **shipped** — `server/src/config.ts` suppresses the warn when `NODE_ENV=test` or `VITEST` is set |
| 6 | Dependency vulnerability audit | **open** — run `npm audit` with network when ready; document advisories |
| 7 | E2E smoke pass (Google + core surfaces) | **open** — manual/CI before release |
| 8 | Docs encoding / mojibake cleanup | **open** — docs-only pass |
| 9 | i18n-lint inline-string sweep | **open** — large; do not mix with tool refactors |

### 9.4 Protections kept intact

- No Google tooling scopes/routes were removed or narrowed.
- No git history rewrite was attempted (author emails remain until approved).
- No secret values were printed into docs or committed files.
- Env files remain gitignored; only `*.example` templates are tracked.

### 9.5 Follow-up implementation (this pass)

| Area | Change |
| ---- | ------ |
| Server config | Quiet `OPENAI_API_KEY` warn in test/Vitest runtimes |
| CI | Gitleaks workflow + allowlist for lockfiles / example envs |
| PII fixtures | Syllabus contact email → `instructor@example.edu` |
| Store metadata | `first_name.txt` cleaned to role-safe display name |
| Code-split | `samlAuthClient.ts` + App dynamic import retarget |
| Docs | This addendum + `SECURITY.md` CI/history notes |
