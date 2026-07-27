# Upgrade backlog (approved @ 40a1098)

Operational / security / quality program for `synaptic_new`. **No new product features** until Wave A P0 items close.

**Principles:** correctness before refactor · one main outcome per PR · tests + rollback note · no framework rewrite.

**Repo facts (verified):** HEAD `40a1098` · `src/` 1059 · `src/lib` 734 · top-level components 83 · 316 unit · ~58 Playwright under `e2e/` · 16 migrations · ROADMAP ~99% (open: App Store, SOC2/DPA, GTM) · SMTP acknowledge-only · scrypt default · OTel present but Helm `otel.enabled: false` · `RUN_MIGRATIONS_ON_START=false` · Gitleaks on PR/push · root not npm workspaces monorepo · CI lacks CodeQL/Trivy/coverage gates.

## Baseline metrics (W0.3)

| Metric | Value | Captured |
|--------|-------|----------|
| HEAD | `40a1098` | 2026-07-19 |
| Client unit tests | 316 | `npm test` |
| E2E specs (`e2e/*.ts`) | 58 | glob |
| Migrations | 16 | `server/migrations` |
| Gitleaks | present (`secret-scan` / ci) | CI |
| Open Dependabot | record via GitHub Security → Dependabot | operator |
| Bundle sizes | capture from CI `visualizer` / build log after B4 | pending B4 |
| E2E perf numbers | existing perf suite artifacts | pending refresh |

## Wave 0 — Orientation

| ID | Status | Done when |
|----|--------|-----------|
| W0.1 Canonical docs | **done** | `docs/INDEX.md` + `docs/history/` + stubs |
| W0.2 Gap freeze | **done** | this file + SECURITY/ROADMAP alignment |
| W0.3 Baseline metrics | **done** | table above |

## Wave A — P0 Security / release hygiene

| ID | Status | Outcome |
|----|--------|---------|
| A1 CI security gates | **done** | audit `--omit=dev`, CodeQL, Trivy, Gitleaks |
| A2 Helm migration Job | **done** | `templates/migrate-job.yaml` + DEPLOYMENT |
| A3 SMTP delivery | **done** | `server/src/lib/email.ts` + auth wiring |
| A4 Session management UX | **done** | list/revoke APIs + Settings UI + tests |
| A5 Password hashing v2 | **done** | `$scrypt-v2$…` + lazy rehash |
| A6 LLM moderation | **done** | server regex + optional OpenAI Moderation + output check |
| A7 JWT rotation runbook | **done** | `docs/runbooks/jwt-rotation.md` |

## Wave B — P1 Observability / contracts / perf

| ID | Status | Notes |
|----|--------|-------|
| B1 `packages/shared` | **started** | error codes package; Zod schemas next PR |
| B2 OTel enablement | **partial** | `values-staging-otel.yaml` + existing telemetry.ts |
| B3 Web-vitals RUM | pending | |
| B4 Bundle / lazy audit | pending | |
| B5 Lighthouse CI | pending | after B4 |
| B6 Testcontainers Postgres | pending | |

## Wave C — P1 Structure / DX

| ID | Status | Notes |
|----|--------|-------|
| C1 Docs history complete | **done** | INDEX + history/ + CONTRIBUTING |
| C2 Feature-folder migration | pending | after B1; one feature / PR |
| C3 Optional npm workspaces | pending | only if B1 proves value |

## Wave D — P2 Product-ops

| ID | Status | Notes |
|----|--------|-------|
| D1 i18n coverage gate | pending | |
| D2 Mobile distribution lanes | pending | |
| D3 A11y widening | pending | |
| D4 SOC2/DPA docs | **draft** | `docs/compliance/SOC2_DPA.md` |
| D5 GDPR export/delete | **partial** | Settings UI existed; keep hardening |
| D6 Backup restore drill | **draft** | `docs/runbooks/backup-restore.md` |
| D7 Plugin API doc | **draft** | `docs/plugins.md` |
| D8 Admin cost/abuse dashboard | pending | |
| D9 Design clarity regression | keep | `minimalClarityContracts` mandatory |

## Explicitly out of scope

- Rewrite to Next/Remix  
- New major learning features before Wave A  
- History email scrub without maintainer signoff  
- Client-side LLM moderation as sole control  
- Big-bang `src/` rename in one PR  
- Full `packages/{client,server,ocr,mobile}` monorepo before shared contracts  

## Execution order

W0 → A1 → A2 → A3 → A4 → A5 → A6 → A7 → B1… → C… → D…
