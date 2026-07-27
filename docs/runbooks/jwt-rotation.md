# JWT / secrets rotation runbook (A7)

**Scope:** rotate `JWT_SECRET`, force logout of refresh sessions, and operate during email outages.  
**Anchors:** `server/src/middleware/auth.ts`, `server/src/store/tokenStore.ts`, `docs/UPGRADE_BACKLOG.md` A7.

## Preconditions

- Staging cluster with `DATABASE_URL` and Helm deploy access.
- Ability to update Kubernetes secret `synapse-api-secrets` key `JWT_SECRET`.
- Confirm `RUN_MIGRATIONS_ON_START=false` and migrations Job is healthy (A2).

## Rotate JWT_SECRET (staging dry-run checklist)

1. Snapshot current secret value location (not the value itself) and note deploy revision.
2. Generate a new secret: `openssl rand -hex 48`.
3. Patch secret / Helm values; roll Deployment (all replicas).
4. **Expected:** existing access JWTs fail verification → clients get 401.
5. **Refresh tokens:** opaque tokens in `auth_tokens` remain valid until consumed/expired; they do **not** embed `JWT_SECRET`. Access tokens must be re-issued via `/auth/refresh` or re-login.
6. Verify: login → `/auth/me` 200; old access token 401.
7. Record dry-run date in the change log / ticket.

## Force logout (all devices)

1. Prefer product path: Settings → revoke all other sessions / revoke all (A4).
2. Ops path: `DELETE FROM auth_tokens WHERE kind = 'refresh' AND account_id = $1;` or truncate refresh rows for incident response.
3. Confirm `/auth/refresh` returns 401 for revoked tokens.

## Email outage fallback

When `EMAIL_PROVIDER` is unset or transport fails:

- `/auth/forgot-password` and `/auth/verify-email/request` still acknowledge (`ok: true`) to avoid account enumeration.
- Dev/staging: tokens may appear in response body when `NODE_ENV !== 'production'`.
- Production without provider: **no email delivered** — operators must use support channel or temporary log-sink in a sealed staging env only.
- Document incident: set `EMAIL_PROVIDER=log` only in non-prod, or repair SMTP/Resend/SES credentials.

## Rollback

- Restore previous `JWT_SECRET` only if no clients have already re-issued under the new secret (otherwise dual-secret support is required — not shipped; prefer forward-only + re-login).
- Feature flags: none for JWT; revert Deployment revision if boot fails.

## Last successful staging dry-run

| Date | Operator | Notes |
|------|----------|-------|
| _pending_ | | Fill after first staging run |
