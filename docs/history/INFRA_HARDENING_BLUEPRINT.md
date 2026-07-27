# Synapse — Technical Infrastructure Hardening Blueprint

**Version:** 1.0 · **Created:** 2026-07-18  
**Scope:** How *every* platform element is strengthened with production-grade technical infrastructure — without omission.  
**Language:** Engineering English (IDs / paths) + Greek executive framing.  
**Canonical companions (do not replace):**
- `PRODUCT_SCALE_STATUS.md` — what ships today  
- `docs/GAP_AUDIT.md` — living open gaps  
- `SECURITY.md` · `DEPLOYMENT.md` · `ARCHITECTURE.md` · `TESTING.md`  
- `WORKSPACE_TOOLS_UPGRADE.md` — pedagogical tool depth (product), not infra  

**This document is the SSoT for *infrastructure hardening*** (reliability, security, data integrity, observability, multi-instance, supply-chain, compliance ops). It is **not** another product-feature wishlist and **not** a duplicate of `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md` / `PAGE_BY_PAGE_OPTIMIZATION_MASTER_PLAN.md` / `STATE_OF_THE_ART_MASTER_UPGRADE_PROMPT.md`.

---

## 0. Executive framing (EL)

Η πλατφόρμα είναι ήδη ~99% product-scale σε λειτουργικό επίπεδο. Αυτό που απομένει για «άρτια τεχνική υποδομή χωρίς παράλειψη» δεν είναι κυρίως νέα UI features — είναι **στρωματοποιημένη ενίσχυση** κάθε στοιχείου σε έξι άξονες:

1. **Correctness & integrity** — δεδομένα, CRDT, migrations, idempotency  
2. **Security & tenancy** — authN/Z, secrets, abuse, supply-chain  
3. **Reliability & scale** — multi-replica, queues, backpressure, failover  
4. **Observability & ops** — SLOs, traces, alerts, runbooks  
5. **Quality gates** — contracts, property tests, chaos, a11y/perf budgets  
6. **Compliance & distribution** — retention, DPA, store signing, audit trails  

Κάθε στοιχείο παρακάτω παίρνει: *τρέχουσα κατάσταση → στόχος hardening → controls → verification → ανοιχτά GAP IDs*.

---

## 1. Methodology

### 1.1 Hardening card schema (mandatory for every element)

| Field | Meaning |
| ----- | ------- |
| **ID** | Stable `INFRA-*` reference |
| **Element** | Subsystem / surface / dependency |
| **Maturity now** | `stub` · `scaffold` · `functional` · `product` · `hardened` |
| **Threat / failure modes** | What breaks or leaks if under-engineered |
| **Target controls** | Concrete infra (code, config, ops) |
| **SLOs / budgets** | Measurable targets |
| **Verification** | Tests, probes, audits that prove the control |
| **GAP links** | Existing `GAP_AUDIT.md` IDs when applicable |
| **Wave** | `W0`…`W6` (see §7) |

### 1.2 Non-negotiable principles

1. **Defense in depth** — client honesty ≠ server trust. Every privileged action has a server authority path.  
2. **Fail closed in prod** — missing Redis / JWT / Stripe secret / DB → refuse start or degrade to documented safe mode (never silent insecure).  
3. **Idempotency everywhere** — webhooks, sync PUTs, OCR jobs, RAG index, account deletion.  
4. **Tenant isolation by construction** — org/class/user scoping in SQL + RBAC middleware + audit row.  
5. **Observability as a feature** — no new critical path without metrics + trace + structured log fields.  
6. **Supply-chain hygiene** — pinned deps, `npm audit`/`pnpm` catalog floors, Dependabot/Renovate, SBOM on release.  
7. **Doc ↔ code single truth** — STATUS + GAP + this blueprint; deprecate conflicting claims in older masters (DOC-02..04).  
8. **No dark launches of secrets** — `.env.example` completeness; secret scanning in CI; no keys in client bundles except public `VITE_*`.

### 1.3 Reference control frameworks (mapped, not cargo-culted)

| Framework lens | Applied to Synapse as |
| -------------- | --------------------- |
| NIST CSF / SSDF | Identify → Protect → Detect → Respond → Recover for SPA + API + mobile |
| OWASP ASVS L2 | Auth, session, API, file upload, SSRF (LLM/OCR proxies), crypto |
| SRE workbook | SLIs/SLOs, error budgets, toil reduction, runbooks |
| ISO 27001 annex themes | Access control, crypto, ops security, supplier (LLM/Stripe) |
| WCAG 2.2 AA | a11y gates already in CI — keep as infra of UX |

---

## 2. Complete element taxonomy (zero omission)

Every row below **must** have a hardening card in §4–§6.

### 2.1 Client application surfaces

| Domain | Elements |
| ------ | -------- |
| Shell | `App.tsx`, `Shell.tsx`, command palette, skip links, toast, offline banner, view transitions, theme (incl. blueprint) |
| Views | Landing, Onboarding, Dashboard, Library, Tasks, Agent, Course, Lesson/Practical, Settings, Analytics, Teacher, Student-org, Note Analysis |
| Overlays | Study Workspace (Notebook + Classic), Review/Exam/Prerequisite, Mistake retry, Upload, Reprocess, Tours |
| Workspace tools (13) | Reader, Concept Map, Scratchpad, Whiteboard, Leitner, Feynman, Quiz, Simulator, Compare, Debate, Timer, Annotations, Dashboard/Progress |
| Notebook chrome | Sources · Chat · Studio panels, mobile tabs, Studio generation actions |
| Workers | recognition, PDF thumbnail, workspace workers |
| Client libs | upload pipeline, DocumentModel, RAG/BM25, FSRS, i18n, persistence (IDB), offline queue, auth client, Sentry, transformers, Pyodide, pdf.js, Mermaid, KaTeX |

### 2.2 Server / sidecars

| Domain | Elements |
| ------ | -------- |
| Core API | Express app, health/live/ready, config fail-closed |
| Auth | Register/login/refresh/logout, password reset, Google OAuth, JWT, token store |
| Sync | Library PUT/GET, session PUT/GET, thumbnails |
| AI proxy | Chat completions, embeddings, usage quotas, rate limit |
| Content AI | OCR pages, NLP entities, transcribe queues, audio TTS/study-guide |
| RAG | Index / query / search / synthesize + pgvector + BullMQ |
| Collab | Hocuspocus Yjs, study rooms SSE, concept-map/annotation streams |
| Enterprise | Teacher, student, org, LTI 1.3, SAML, audit logs, RBAC |
| Billing | Stripe checkout + webhook idempotency |
| MCP | `/mcp` tools + OAuth well-known |
| Sidecar | `ocr-server` (Tesseract / vision) |
| Data | Postgres migrations, Redis, retention crons, account deletion cascade |

### 2.3 Mobile & distribution

Capacitor shell, Android/iOS projects, Fastlane lanes, distribution URL sync, privacy/legal pages, store metadata.

### 2.4 Infra & delivery

Vite/PWA build, Netlify, Vercel, Docker Compose, server Dockerfile, Helm chart, GitHub Actions CI matrix, chunk-error beacons.

### 2.5 Cross-cutting

Secrets, CORS, CSRF posture, dependency CVE floor, OTEL, Sentry, backup/restore, DR, i18n lint, doc-lint, eval gold sets.

---

## 3. Cross-cutting infrastructure strata

These apply to **all** elements. Per-element cards assume these strata exist.

### 3.1 STRATA-SEC — Security substrate

| Control | Target | Verification |
| ------- | ------ | ------------ |
| JWT HS256 → eventual asymmetric or rotating secrets | Dual-key rotation window; revoke list in Redis | Integration tests + chaos revoke |
| Refresh token rotation + reuse detection | One-time refresh; reuse → family kill | `server` auth tests |
| Email verification before privileged sync | Gate library/session write until verified | E2E auth path |
| Distributed rate limit | Redis token bucket for all `/auth` + `/v1` | Multi-replica load test |
| LLM proxy allowlist + body size + prompt injection filters | Schema validation; max tokens; tool-call sandbox | Contract tests + red-team prompts |
| Upload malware/size/type gates | Magic-byte sniff; max pages; virus scan hook (ClamAV optional) | Fuzz corpus |
| Stripe webhook signature **required** in prod | Fail closed if unsigned | Config boot test |
| Secret scanning CI | gitleaks / TruffleHog on PR | CI job |
| Dependency CVE policy | High/Critical = merge block; pin floors (e.g. vite ≥7.3.6, esbuild ≥0.28.1) | `npm audit` / Renovate |
| CSP + Trusted Types (progressively) | Report-Only → enforce on static host | Lighthouse + header probes |

**Open today:** email verification, refresh UX, agent moderation, multi-instance OAuth/Google token stores (`SECURITY.md`, MCP-03).

### 3.2 STRATA-DATA — Data integrity substrate

| Control | Target | Verification |
| ------- | ------ | ------------ |
| Migrations expand/contract | Backward-compatible; documented rollback | Migration CI dry-run |
| Sync conflict policy | Vector clocks / ETag / last-write-wins **documented per resource** | Property tests |
| CRDT authority | Yjs docs backed by persisted snapshots + compaction | Collab soak test |
| Soft-delete + retention jobs | OPS retention already shipped — extend to blobs/thumbs | Cron dry-run metrics |
| Backup | Automated Postgres PITR + Redis AOF; restore drill quarterly | Runbook evidence |
| PII inventory | Field-level classification; export/erase (GDPR) | Account deletion E2E |

### 3.3 STRATA-REL — Reliability / scale substrate

| Control | Target | Verification |
| ------- | ------ | ------------ |
| Stateless API replicas | Session in Redis/DB; sticky only for SSE where needed | Helm `replicas≥2` soak |
| Queue backpressure | BullMQ concurrency + DLQ + poison alerts | Job failure injection |
| Circuit breakers | LLM / OCR / Stripe / Google APIs | Chaos timeouts |
| Graceful drain | SIGTERM: stop intake, finish in-flight, close Hocuspocus | K8s rolling update test |
| Offline client queue | Library push already; extend session/annotations with conflict UI | Offline E2E |
| CDN / asset integrity | Immutable hashed assets; SW update strategy | PWA update E2E |

### 3.4 STRATA-OBS — Observability substrate

| Control | Target | Verification |
| ------- | ------ | ------------ |
| RED + USE metrics | Request rate/error/duration; queue lag; OCR latency | Prometheus / OTEL export |
| Trace propagation | `traceparent` client→API→OCR→LLM | Sampled traces in staging |
| Structured logs | `requestId`, `userId` (hashed), `orgId`, `route`, `outcome` | Log schema lint |
| Client RUM | Sentry + chunk-error beacon + Web Vitals | Staging canary |
| Alerting | Burn-rate SLO alerts (auth, sync, OCR, billing) | Alert dry-run |
| Feature probes | `/ready` already exposes L4–L20 flags — keep honest | Probe contract test |

**SLOs (initial production targets):**

| SLI | SLO |
| --- | --- |
| API availability (`/ready` + 5xx) | 99.9% / 30d |
| Auth login p95 | < 400 ms (ex-network LLM) |
| Library sync PUT p95 | < 800 ms for ≤5 MB payload |
| OCR page p95 (server) | < 8 s / page |
| Workspace TTI (warm cache) | < 2.5 s (existing B11 gate) |
| Collab join success | ≥ 99% when Redis+DB healthy |

### 3.5 STRATA-QA — Quality substrate

| Gate | Scope |
| ---- | ----- |
| Typecheck all | client + server |
| Unit/integration | Vitest client ~270 + server ~38 — grow auth/billing matrix |
| Eval gold | `npm run eval` — block regression on recognition/RAG scores |
| E2E critical path | auth → upload → workspace tool → quiz → sync |
| a11y / visual / perf | existing CI jobs — treat failures as P0 |
| Contract tests | OpenAPI/Zod schemas for every public route |
| Chaos week | Kill Redis, pause Postgres, 429 LLM — document recovery |
| Mobile smoke | Detox/Appium or Maestro on signed builds before store push |

### 3.6 STRATA-COMPLY — Compliance / trust substrate

| Control | Target |
| ------- | ------ |
| Privacy / ToS / DPA | Live URLs (OPS-05 shipped); counsel sign-off OPS-06 |
| Retention | Documented + automated (OPS-01..03 shipped) |
| Audit logs | Immutable append; export for org admins |
| SOC2 path | Access reviews, change management via PRs, incident runbook |
| Store compliance | Privacy nutrition labels, data safety forms, signed builds OPS-04 |

---

## 4. Per-element hardening — Client

### 4.1 Application shell & navigation

| ID | Element | Now | Target controls | Verification | Wave |
| -- | ------- | --- | --------------- | ------------ | ---- |
| INFRA-CL-01 | View-state router (`AppView`) | product | Typed transition graph; deep-link schema versioned; deny unknown views; restore on SW update | E2E deep links + property test on transitions | W1 |
| INFRA-CL-02 | Shell / skip links / toasts | product | Focus trap inventory; toast ARIA live regions; offline banner as single source | a11y CI | W1 |
| INFRA-CL-03 | Command palette | product | Action registry with RBAC-aware filtering; telemetry on invoke | Unit + a11y | W2 |
| INFRA-CL-04 | Theme / blueprint tokens | product | Token contract test (contrast ratios AA); no hard-coded colors in tools | Contrast CI script | W2 |
| INFRA-CL-05 | Chunk load / SW | product | Chunk error → Sentry + beacon; SW skipWaiting policy documented; rollback build | `e2e/chunk-failure-*` | W0 |

### 4.2 Views (each page)

For **every** view in §2.1, apply the same hardening checklist (STATE_OF_THE_ART §20 questionnaire remains product UX; infra below is mandatory):

| Checklist item | Infra meaning |
| -------------- | ------------- |
| Error boundary | Route-level boundary + recovery CTA + report |
| Loading | Skeleton budgets; no layout thrash (CLS) |
| Empty | Deterministic empty + CTA (WS-01 shipped pattern) |
| Auth gate | Explicit; no flash of privileged data |
| i18n | All strings keyed; `i18n-lint` clean |
| Telemetry | View enter/exit + key conversion events |
| Perf budget | Route-specific LCP/INP budgets in perf CI |
| Offline | Read-only or queued mutations labeled honestly |

| ID | View | Special infra notes | Wave |
| -- | ---- | ------------------- | ---- |
| INFRA-CL-10 | Landing | Marketing CSP; no secrets; trust badges truthful | W1 |
| INFRA-CL-11 | Onboarding | Persist draft; resume; schema version | W1 |
| INFRA-CL-12 | Dashboard | Aggregate selectors memoized; no N+1 IDB | W1 |
| INFRA-CL-13 | Library | Upload backpressure; blob quota UI; reprocess queue integrity | W0 |
| INFRA-CL-14 | Tasks | Optimistic updates + conflict on sync | W2 |
| INFRA-CL-15 | Agent | Prompt moderation; citation integrity; cancel/abort tokens; cost meter | W0 |
| INFRA-CL-16 | Course / Lesson | Content schema validation; progressive hydration | W1 |
| INFRA-CL-17 | Settings | Secret fields never logged; session revoke list UI | W0 |
| INFRA-CL-18 | Analytics | Privacy: no raw PII in charts; export watermark | W2 |
| INFRA-CL-19 | Teacher / Student-org | Tenant guard client mirrors server; CSV export audited | W1 |
| INFRA-CL-20 | Note Analysis | Algorithm transparency panels must match actual pipeline versions | W2 |

### 4.3 Study Workspace & tools

| ID | Element | Threats | Target controls | GAP | Wave |
| -- | ------- | ------- | --------------- | --- | ---- |
| INFRA-WS-01 | Notebook layout | State loss on remount | Single provider; persisted panel ratios; crash recovery snapshot | — | W0 |
| INFRA-WS-02 | Sources panel | Stale blob / missing thumb | Content-addressed blob keys; backfill jobs; multi-page thumbs | SRC-08 | W3 |
| INFRA-WS-03 | Chat panel | Ungrounded answers | Mandatory citation schema; refuse if retrieval empty in grounded mode | — | W1 |
| INFRA-WS-04 | Studio actions | Double-generate / cost blowups | Idempotent generation keys; progress state machine | — | W1 |
| INFRA-WS-10 | Reader | OCR span drift | Re-anchor spans post-reprocess; checksum text vs overlay | TOOL-RD-03/04 | W2 |
| INFRA-WS-11 | Annotations | Concurrent edit loss | CRDT or OT + conflict UI | TOOL-AN-02, COL-02 | W2 |
| INFRA-WS-12 | Scratchpad | Wrong math | SymPy offline + unit checker; golden math tests | TOOL-SP-02/03 | W3 |
| INFRA-WS-13 | Concept Map | Collab divergence | Yjs snapshot compaction; authority reconcile | COL-03 shipped | W1 |
| INFRA-WS-14 | Whiteboard | No shared state | Shared Yjs doc or explicit “local-only” label | COL-04 | W3 |
| INFRA-WS-15 | Leitner / FSRS | Sync skew | Server-authoritative card state; clock skew tolerance | MD-04 | W1 |
| INFRA-WS-16 | Quiz | Cheating / lost attempts | Server attempt history (shipped); signed session tokens optional | TOOL-QZ-03 | W1 |
| INFRA-WS-17 | Simulator | Non-reproducible | Seeded RNG; preset schema version | — | W2 |
| INFRA-WS-18 | Feynman / Compare / Debate | Ungrounded pedagogy | Agent prompts bound to source hashes | — | W2 |
| INFRA-WS-19 | Timer | Missed notifications | Capacitor local notifications (mobile); .ics integrity | — | W3 |
| INFRA-WS-20 | Progress / Dashboard tool | Misleading metrics | Time-on-tool already; add server rollups for multi-device | TOOL-PR-* | W2 |

### 4.4 Client data plane

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-CL-30 | `useStore` mega-store | Slice modules; selector purity; persistence schema migrations with adapters | W1 |
| INFRA-CL-31 | IndexedDB | Quota handling; corruption repair; encryption-at-rest option for enterprise | W2 |
| INFRA-CL-32 | Offline queue | Exactly-once push; poison message UI; backoff | W1 |
| INFRA-CL-33 | Workers | Transferable ownership; heartbeat; cancel; memory caps | W1 |
| INFRA-CL-34 | transformers.js / TrOCR | Model checksum; Cache API versioning; PLT-03 offline embeddings policy | W3 |
| INFRA-CL-35 | Pyodide | Sandbox CSP; no network from worker; stdlib pin via postinstall | W1 |
| INFRA-CL-36 | pdf.js | Worker isolation; max page render concurrency | W1 |
| INFRA-CL-37 | i18n | EL/EN parity gate; ICU plurals; RTL-ready structure | W2 |

---

## 5. Per-element hardening — Server & data

### 5.1 Edge & platform API

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-SV-01 | Boot / config | Zod-validate env; fail closed on missing prod secrets | W0 |
| INFRA-SV-02 | `/live` `/ready` | Dependency checks (DB, Redis, optional OCR); truthful feature flags | W0 |
| INFRA-SV-03 | CORS | Explicit origins; no `*` with credentials | W0 |
| INFRA-SV-04 | Request limits | Body size, timeout, slowloris shields | W0 |
| INFRA-SV-05 | Error model | Problem+JSON; no stack traces in prod | W0 |

### 5.2 Auth & identity

| ID | Element | Target controls | GAP / notes | Wave |
| -- | ------- | --------------- | ----------- | ---- |
| INFRA-SV-10 | Password auth | scrypt/argon2id audit; breach password check (k-anonymity API) | SECURITY.md | W1 |
| INFRA-SV-11 | Refresh tokens | Rotation + reuse detection; Redis/Postgres store | multi-replica | W0 |
| INFRA-SV-12 | Email verification | Required for sync/billing | SECURITY.md open | W1 |
| INFRA-SV-13 | Google OAuth | Postgres token store (not memory); PKCE; revoke | multi-instance gap | W1 |
| INFRA-SV-14 | RBAC | Central policy module; deny-by-default; tests per role | — | W1 |
| INFRA-SV-15 | Session UX | List/revoke devices in Settings | SECURITY.md | W1 |

### 5.3 Sync & storage

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-SV-20 | Library sync | ETag / If-Match; size quotas; schema version negotiate | W1 |
| INFRA-SV-21 | Session sync | Field-level merge policy documented | W1 |
| INFRA-SV-22 | Thumbnails | CDN cache headers; signed URLs; backfill worker | W2 |
| INFRA-SV-23 | Blobs (future S3) | Server-side encryption; lifecycle policies | W4 |

### 5.4 AI / OCR / RAG / audio

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-SV-30 | LLM proxy | Key server-only; model allowlist; cost accounting; abuse RPM | W0 |
| INFRA-SV-31 | Embeddings | Same as LLM; cache by content hash | W1 |
| INFRA-SV-32 | OCR `/v1/ocr/pages` | Authz; page caps; sidecar mTLS or private network; timeout | W1 |
| INFRA-SV-33 | `ocr-server` | Resource limits; non-root; health; Greek vision engine SLOs | W1 |
| INFRA-SV-34 | Transcribe queue | DLQ; PII redaction option; retention OPS-02 | W1 |
| INFRA-SV-35 | RAG pgvector | Tenant-scoped indexes; reindex job; poisoning defenses | W1 |
| INFRA-SV-36 | Audio TTS | Rate limit; content filter; cache | W2 |

### 5.5 Collaboration

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-SV-40 | Hocuspocus | Auth on connect; doc ACL; snapshot persist; horizontal scale sticky/Redis pubsub | W1 |
| INFRA-SV-41 | Study rooms SSE | Backpressure; heartbeat; reconnect tokens | W1 |
| INFRA-SV-42 | Annotation stream | Conflict protocol aligned with COL-02 UI | W2 |

### 5.6 Enterprise & billing

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-SV-50 | Org / teacher / student | Tenant middleware on every query; audit every mutation | W1 |
| INFRA-SV-51 | LTI 1.3 | Prod AGS grade passback (not stub); key rotation; NRPS already | OPS-07 | W2 |
| INFRA-SV-52 | SAML | Cert rotation runbook; clock skew; metadata signing | W2 |
| INFRA-SV-53 | Stripe | Signature required; idempotency keys; plan entitlement cache | W0 |
| INFRA-SV-54 | Admin | `ADMIN_SECRET` rotation; IP allowlist optional; no browser storage | W0 |

### 5.7 MCP

| ID | Element | Target controls | GAP | Wave |
| -- | ------- | --------------- | --- | ---- |
| INFRA-SV-60 | MCP tools | Least privilege scopes; audit tool invokes | — | W1 |
| INFRA-SV-61 | MCP OAuth | Postgres store for multi-instance | MCP-03 | W1 |
| INFRA-SV-62 | SSE quiz | Stream with cancel + partial persistence | MCP-01 | W2 |
| INFRA-SV-63 | Client MCP artifacts | Readers for flashcards/annotations | MCP-02 | W2 |

### 5.8 Data plane & jobs

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-DB-01 | Migrations | Expand/contract; CI migrate up/down | W0 |
| INFRA-DB-02 | Redis | Auth, TLS, eviction policy, fail-closed rate limit | W0 |
| INFRA-DB-03 | Retention / deletion | Already shipped — add metrics + alert on lag | W1 |
| INFRA-DB-04 | Backup / PITR | Automated + quarterly restore drill | W2 |

---

## 6. Per-element hardening — Mobile, deliver, supply-chain

### 6.1 Mobile

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-MO-01 | Capacitor bridge | Allowlist plugins; no arbitrary URL open | W1 |
| INFRA-MO-02 | Network plugin | Already wired — unify with offline queue | W1 |
| INFRA-MO-03 | Fastlane | Secrets in CI OIDC; provenance for builds | W1 |
| INFRA-MO-04 | Store submission | Signed binaries + privacy forms + crash symbol upload | W2 |
| INFRA-MO-05 | Push (future) | Opt-in; topic ACL; no PII in payload | W4 |
| INFRA-MO-06 | Secure storage | Prefer Keychain/Keystore for tokens vs localStorage WebView | W2 |

### 6.2 Delivery & hosting

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-DL-01 | Static host | Security headers (CSP, HSTS, Referrer-Policy) | W0 |
| INFRA-DL-02 | Netlify / Vercel functions | Auth on chunk-error ingest; rate limit; PII scrub | W1 |
| INFRA-DL-03 | Docker / Compose | Non-root; read-only FS where possible; healthchecks | W1 |
| INFRA-DL-04 | Helm | Resource requests/limits; PDB; HPA; network policies | W1 |
| INFRA-DL-05 | DNS / TLS | Automated cert renew; CAA records | W1 |

### 6.3 Supply-chain & CI

| ID | Element | Target controls | Wave |
| -- | ------- | --------------- | ---- |
| INFRA-CI-01 | Dependency floor | vite≥7.3.6, esbuild≥0.28.1; Renovate grouping | W0 |
| INFRA-CI-02 | CI matrix | Keep typecheck/unit/e2e/a11y/visual/perf/eval; add contract + gitleaks | W0 |
| INFRA-CI-03 | SBOM | CycloneDX on release tags | W2 |
| INFRA-CI-04 | Provenance | Sigstore / GitHub Artifact Attestations | W3 |
| INFRA-CI-05 | Doc drift CI | Fail if ARCHITECTURE tool count ≠ registry | DOC-02 | W1 |

---

## 7. Execution waves (infra-only)

| Wave | Theme | Exit criteria |
| ---- | ----- | ------------- |
| **W0 — Seal the perimeter** | Fail-closed config, Stripe signed, Redis rate limit, CSP headers, CVE floors, chunk/SW, LLM proxy abuse | `npm audit` high=0; boot tests; auth RPM multi-replica |
| **W1 — Multi-instance truth** | Postgres stores (OAuth/Google/refresh), Helm HPA, OTEL dashboards, sync ETags, email verify, RBAC tests | 2-replica soak 24h green |
| **W2 — Integrity & collab** | Annotation conflict UI, OCR re-anchor, LTI AGS prod, SAML runbook, SBOM, device revoke UX | GAP COL-02, TOOL-RD-04, OPS-07 closed or scheduled |
| **W3 — Depth infra** | SymPy/units, multi-page thumbs, whiteboard CRDT, offline embeddings policy, store submission | SRC-08, COL-04, PLT-03 decided |
| **W4 — Enterprise DR** | S3 blobs, PITR drills, push notifications optional, regional failover design | Restore drill evidence |
| **W5 — Formal assurance** | ASVS L2 gap close, pen-test remediation, SOC2 control mapping | External report |
| **W6 — Continuous hardening** | Chaos calendar, threat-model quarterly, dependency SLA | Recurring |

---

## 8. Mapping — open GAP_AUDIT → infra waves

| GAP ID | Infra home | Wave |
| ------ | ---------- | ---- |
| SRC-08 | INFRA-WS-02 | W3 |
| TOOL-RD-03/04 · TOOL-AN-03 | INFRA-WS-10 | W2 |
| TOOL-AN-02 · COL-02 | INFRA-WS-11 / INFRA-SV-42 | W2 |
| TOOL-SP-02/03 | INFRA-WS-12 | W3 |
| COL-04 | INFRA-WS-14 | W3 |
| OPS-06 | STRATA-COMPLY | W2 |
| OPS-07 | INFRA-SV-51 | W2 |
| MCP-01..03 | INFRA-SV-61..63 | W1–W2 |
| PLT-03 | INFRA-CL-34 | W3 |
| AI-05 | product flag policy + INFRA-CL-15 | W2 |
| DOC-02..04 | INFRA-CI-05 | W1 |
| SECURITY leftovers (email verify, refresh UX, moderation) | INFRA-SV-11/12 · INFRA-CL-15 | W0–W1 |

---

## 9. Acceptance matrix (definition of *hardened*)

An element is **hardened** only when **all** are true:

1. Threat/failure modes documented in this blueprint (or linked ADR).  
2. Controls implemented in code/config/IaC — not “planned”.  
3. Automated verification in CI or scheduled soak.  
4. Observability: at least one metric + one log field + alert or probe.  
5. Runbook section exists for break/fix (can live in `DEPLOYMENT.md` / `docs/runbooks/`).  
6. GAP row moved to `shipped` or explicitly `wontfix` with rationale.  
7. No High/Critical CVE in its dependency closure.  

---

## 10. Anti-duplication policy

| Do | Don't |
| -- | ----- |
| Close gaps in `docs/GAP_AUDIT.md` | Spawn another 1000-line product masterplan |
| Update `PRODUCT_SCALE_STATUS.md` when infra ships | Rewrite `EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md` |
| Add ADRs under `docs/adr/` for irreversible choices | Mix aesthetic OPT-* work into infra waves |
| Keep tool pedagogy in `WORKSPACE_TOOLS_UPGRADE.md` | Treat UI polish as security hardening |

---

## 11. Immediate next actions (recommended)

1. **W0 sprint** — fail-closed prod config tests; Redis rate-limit verification under 2 replicas; CSP headers on static host; Dependabot + audit gate; agent prompt moderation MVP.  
2. **W1 sprint** — Postgres persistence for MCP OAuth + Google tokens; email verification; refresh reuse detection; sync ETag; doc-drift CI for tool count.  
3. **Create `docs/runbooks/`** — auth outage, Redis down, OCR backlog, Stripe webhook replay, collab split-brain.  
4. **Pen-test readiness pack** — ASVS checklist mapped to routes in `API.md`.  

---

## 12. Inventory checksum

If a subsystem exists in the repo but is missing from §2 taxonomy or §4–§6 cards, that is a **P0 documentation defect** — add it before claiming “χωρίς παράλειψη”.

**Last inventory reconciliation:** 2026-07-18 against `src/`, `server/src/`, `mobile/`, `ocr-server/`, CI workflows, and `docs/GAP_AUDIT.md`.

---

*Maintainers: bump version when waves complete; link closed INFRA-* IDs from GAP_AUDIT Notes column.*
