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
| Push to `synaptic_refined` + `synaptic_new` | pending commit |
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
