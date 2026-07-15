# Security

This document describes the threat model, the controls currently in place,
and the deployment checklist required before exposing Synapse to real
learners.

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
| LLM key never leaves server | `server/src/lib/upstream.ts` | The browser sends no provider key. |
| JWT auth (`HS256`) | `server/src/middleware/auth.ts` | Configured by `JWT_SECRET`. |
| Refresh + password-reset tokens | `server/src/routes/auth.ts`, `server/src/store/tokenStore.ts` | Refresh tokens are hashed, TTL-bound, revocable; password-reset tokens reuse the same store. |
| CORS allowlist | `server/src/index.ts` | `ALLOWED_ORIGINS` (comma-separated, no `*` in production). |
| Per-account, per-month token quota | `server/src/middleware/usage.ts` | Returns `429` once cap hit. |
| Per-account/IP RPM limiter | `server/src/middleware/rateLimit.ts` | Sliding-window limiter on all `/v1/*` routes; current implementation is in-memory/single-node. |
| Plan-aware billing | `server/src/routes/billing.ts` | Plan changes only flow through Stripe webhook events. |
| Stripe webhook signature verification | `billingWebhookHandler` | Required in production (`STRIPE_WEBHOOK_SECRET`). Unsigned bodies rejected when `NODE_ENV=production`. Dev/test may parse unsigned JSON. |
| Webhook idempotency | `webhookIdempotency.ts` | Stripe `event.id` deduplication prevents double plan upgrades on retries. |
| Admin endpoint behind shared secret | `server/src/routes/admin.ts` | `x-admin-secret: $ADMIN_SECRET`. |
| Postgres parameterized queries | `server/src/store/postgres.ts` | No string-concatenated SQL. |
| Anonymous fallback | `ALLOW_ANONYMOUS=true` | All anonymous traffic uses one synthetic account; turn off for paid tiers. |

### Client-side

| Control | Where | Notes |
| ------- | ----- | ----- |
| Bearer-token storage | `src/lib/authClient.ts` | Stored in `localStorage` under `synapse:auth-v1`; cleared on logout. |
| Same-origin proxy by default | `src/lib/llmClient.ts` | Configurable via Settings → Managed proxy URL. |
| Demo content gated behind setting | `src/lib/demoMode.ts` | `synapse:demo-mode` defaults to `hidden`; the ROADMAP/PERSISTENCE files describe the isolation. |
| Strict source mode for the Agent | `src/lib/sourceContext.ts` | RAG retrieval is the only context unless the user enables enriched. |
| KaTeX/Mermaid render in safe modes | `src/components/Reader.tsx` etc. | No raw HTML from LLM is dangerously injected. |

## Production checklist

Before exposing Synapse to real learners:

1. **TLS everywhere** — terminate at a reverse proxy (nginx, Caddy, cloud
   LB). Do not run the Node process bare on port 80.
2. **Set every secret** — `OPENAI_API_KEY`, `JWT_SECRET` (≥32 random bytes),
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_SECRET` (**required in
   production** — admin routes reject all callers without it),
   `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for Google
   Tools / Calendar / Tasks / Meet).
3. **Pin CORS** — `ALLOWED_ORIGINS` must list only your real frontend
   origins; never `*` in production.
4. **Disable anonymous** — `ALLOW_ANONYMOUS=false` for paid/managed tiers.
5. **Verify webhook signatures** — set `STRIPE_WEBHOOK_SECRET` so
   `/v1/billing/webhook` rejects unsigned bodies.
6. **Secure admin** — set `ADMIN_SECRET`. Without it, production returns
   403 for all `/v1/admin/*` callers. Dev may allow non-anonymous accounts
   only when `NODE_ENV !== production` and no secret is set.
7. **Never commit `.env` / `.env.local`** — use `.env.example` /
   `.env.local.example` only. Client Vite keys must stay empty templates.
8. **Run migrations once** — set `RUN_MIGRATIONS_ON_START=false` in
   multi-replica deployments and call `npm run migrate` from CI.
9. **Rotate `JWT_SECRET`** at least quarterly; force-logout on rotation.
10. **Layer edge rate limiting on top of the built-in limiter** — the server
   already enforces an in-process per-account/IP RPM cap on `/v1/*`, but
   production should add an edge/global limiter and move to a distributed
   store before multi-replica scale.
11. **Structured logging + audit trail** for `/auth/*`, `/v1/billing/*`, and
    `/v1/admin/*`. The current code uses `console.log`; pipe through your log
    aggregator.
12. **Backups** — `pg_dump` the `accounts`, `account_libraries`, and
    `account_sessions` tables on a schedule; the JSONB blobs are the
    learner's data.

## Roadmap (not yet in code)

- Access/refresh rotation UX and session-management surfaces.
- Email verification.
- Password hashing parameter audit (currently scrypt with default cost — see
  `server/src/store/accounts.ts`).
- Distributed / Redis-backed rate limiting (the current limiter is single-node).
- Content moderation pass on Agent prompts.
- CSRF protection if cookies are added later (current Bearer-token flow does
  not need it).

## Reporting vulnerabilities

Open a private security issue or email the maintainers. Please do **not**
file public issues for security-sensitive findings; include a clear
reproduction and the affected commit hash.
