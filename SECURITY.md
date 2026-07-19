# Security

This document describes the threat model, the controls currently in place,
and the deployment checklist required before exposing Synapse to real
learners.

Companion: `docs/INFRA_HARDENING_BLUEPRINT.md` (W0–W6 infrastructure waves).

## Threat model

Synapse has two surfaces:

1. **Client (Vite SPA)** — runs untrusted code in the user's browser, holds
   the JWT for that account, and stores library + session data in
   `localStorage` / IndexedDB.
2. **Server (Node/Express)** — holds the LLM provider key, the JWT signing
   secret, the Stripe secret key, and the Postgres credentials.

Adversaries we care about:

- **Curious user** trying to extract the LLM key or escalate plan.
- **Other users** on a shared/managed deployment trying to read each other's
  library or session.
- **Internet-scale attackers** scraping the proxy to free-ride on the LLM
  budget or run prompt-injection chains.
- **Webhook spoofing** — any endpoint that mutates plan state.

## Controls in place

### Server-side

| Control | Where | Notes |
| ------- | ----- | ----- |
| Fail-closed production boot | `server/src/lib/assertProductionConfig.ts` | Refuses start when JWT/CORS/anonymous/DB/admin/OpenAI (and Stripe webhook if Stripe enabled) are unsafe. |
| LLM key never leaves server | `server/src/lib/upstream.ts` | The browser sends no provider key. |
| Model allowlist | `server/src/lib/modelAllowlist.ts` | `/v1/chat/completions` + `/embeddings` reject unknown models (`LLM_ALLOWED_MODELS`). |
| Prompt moderation MVP | `server/src/lib/promptModeration.ts` | Blocks injection/exfil patterns + oversized payloads before upstream. |
| JWT auth (`HS256`) | `server/src/middleware/auth.ts` | Configured by `JWT_SECRET`. |
| Refresh + password-reset tokens | `server/src/routes/auth.ts`, `server/src/store/tokenStore.ts` | Refresh tokens are hashed, TTL-bound, revocable; password-reset tokens reuse the same store. |
| CORS allowlist | `server/src/index.ts` | `ALLOWED_ORIGINS` (comma-separated, no `*` in production). |
| Per-account, per-month token quota | `server/src/middleware/usage.ts` | Returns `429` once cap hit. |
| Per-account/IP RPM limiter | `server/src/middleware/rateLimit.ts` | Sliding-window on **`/auth/*` and `/v1/*`**; Redis-backed when `REDIS_URL` is set (`RATE_LIMIT_REQUIRE_REDIS` fail-closed). |
| Plan-aware billing | `server/src/routes/billing.ts` | Plan changes only flow through Stripe webhook events. |
| Stripe webhook signature verification | `billingWebhookHandler` | Required in production (`STRIPE_WEBHOOK_SECRET`). Unsigned bodies rejected when `NODE_ENV=production`. Dev/test may parse unsigned JSON. |
| Webhook idempotency | `webhookIdempotency.ts` | Stripe `event.id` deduplication prevents double plan upgrades on retries. |
| Admin endpoint behind shared secret | `server/src/routes/admin.ts` | `x-admin-secret: $ADMIN_SECRET`. |
| Postgres parameterized queries | `server/src/store/postgres.ts` | No string-concatenated SQL. |
| Anonymous fallback | `ALLOW_ANONYMOUS=true` | All anonymous traffic uses one synthetic account; turn off for paid tiers. |
| Email verification gate | `requireEmailVerified` + `/auth/verify-email*` | Blocks privileged sync PUTs when `EMAIL_VERIFICATION_REQUIRED` (default prod). |
| Sync ETags | `library.ts` / `session.ts` | `ETag` on GET; `If-Match` → 412 on mismatch. |
| Google OAuth tokens (PG) | `googleTokenStore` + `google_oauth_tokens` | Durable multi-instance when `DATABASE_URL` set. |
| MCP OAuth clients/codes (PG) | `mcp/oauth/store` + migrations | Durable multi-instance when `DATABASE_URL` set. |

### Client / static host

| Control | Where | Notes |
| ------- | ----- | ----- |
| Bearer-token storage | `src/lib/authClient.ts` | Stored in `localStorage` under `synapse:auth-v1`; cleared on logout. |
| Same-origin proxy by default | `src/lib/llmClient.ts` | Configurable via Settings → Managed proxy URL. |
| Demo content gated behind setting | `src/lib/demoMode.ts` | `synapse:demo-mode` defaults to `hidden`. |
| Strict source mode for the Agent | `src/lib/sourceContext.ts` | RAG retrieval is the only context unless the user enables enriched. |
| KaTeX/Mermaid render in safe modes | Reader / scratchpad | No raw HTML from LLM is dangerously injected. |
| Security headers + CSP | `netlify.toml`, `vercel.json` | nosniff, frame deny, referrer, Permissions-Policy, CSP (W0). |
| Chunk error reporting | `chunkErrorReporter.ts` | Sentry + `/__chunk_errors` beacon. |
| SW update policy | `vite.config.ts` PWA `registerType: autoUpdate` | New builds claim clients; rollback = redeploy prior `dist`. |

### Supply chain

| Control | Where | Notes |
| ------- | ----- | ----- |
| Dependabot | `.github/dependabot.yml` | Weekly npm (root + server) + monthly Actions. |
| `npm audit` CI gate | `.github/workflows/ci.yml` `audit` job | Fails on high+ findings. |
| Secret scanning | `.github/workflows/ci.yml` `gitleaks` job | Blocks leaked credentials on PR. |
| Vite / esbuild floors | `package.json` | vite ≥ 7.3.6; esbuild override 0.28.1 (CVE-2026-53571 / GHSA-g7r4-m6w7-qqqr). |

## Production checklist

Before exposing Synapse to real learners:

1. **TLS everywhere** — terminate at a reverse proxy (nginx, Caddy, cloud
   LB). Do not run the Node process bare on port 80.
2. **Set every secret** — `OPENAI_API_KEY`, `JWT_SECRET` (≥32 random bytes),
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_SECRET` (**required in
   production** — boot + admin routes refuse without it),
   `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for Google
   Tools / Calendar / Tasks / Meet).
3. **Pin CORS** — `ALLOWED_ORIGINS` must list only your real frontend
   origins; never `*` in production (enforced at boot).
4. **Disable anonymous** — `ALLOW_ANONYMOUS=false` (enforced at boot).
5. **Verify webhook signatures** — set `STRIPE_WEBHOOK_SECRET` so
   `/v1/billing/webhook` rejects unsigned bodies.
6. **Secure admin** — set `ADMIN_SECRET`.
7. **Never commit `.env` / `.env.local`** — use `.env.example` /
   `.env.local.example` only. Client Vite keys must stay empty templates.
8. **Run migrations once** — set `RUN_MIGRATIONS_ON_START=false` in
   multi-replica deployments and call `npm run migrate` from CI.
9. **Rotate `JWT_SECRET`** at least quarterly; force-logout on rotation.
10. **Redis for multi-replica** — set `REDIS_URL` so `/auth` + `/v1` rate
    limits are distributed; keep `RATE_LIMIT_REQUIRE_REDIS=true` (default
    when Redis is configured).
11. **Structured logging + audit trail** for `/auth/*`, `/v1/billing/*`, and
    `/v1/admin/*`.
12. **Backups** — `pg_dump` the `accounts`, `account_libraries`, and
    `account_sessions` tables on a schedule.

## Roadmap (not yet in code)

- Access/refresh rotation UX and session-management surfaces.
- Stronger email delivery (SMTP) for verification tokens (API routes exist; prod currently acknowledges without sending).
- Password hashing parameter audit (currently scrypt with default cost — see
  `server/src/store/accounts.ts`).
- Stronger LLM safety (vendor Moderation API / classifier) beyond MVP regex.
- CSRF protection if cookies are added later (current Bearer-token flow does
  not need it).

## Reporting vulnerabilities

Open a private security issue or email the maintainers. Please do **not**
file public issues for security-sensitive findings; include a clear
reproduction and the affected commit hash.
