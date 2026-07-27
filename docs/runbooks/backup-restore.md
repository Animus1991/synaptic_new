# Backup restore drill (D6)

**Goal:** prove Postgres (and Redis if used for rate limits) can be restored within RTO/RPO targets.

## Cadence

- Quarterly minimum; after major schema migrations (Wave B6+).
- Record **last-success date** in the table below.

## Procedure (staging)

1. Take/identify latest automated backup (provider snapshot or `pg_dump`).
2. Restore into a disposable Postgres instance (not production).
3. Point a one-off API pod / Job at the restored `DATABASE_URL`.
4. Run `npm run migrate` (or Helm migrate Job) — should be no-op or apply only pending.
5. Smoke: `/live`, `/ready`, login, `/auth/me`, library GET.
6. Tear down disposable instance.

## Pass criteria

- Restore completes within documented RTO.
- No silent data loss vs backup inventory checklist (accounts, auth_tokens, libraries).
- Application boots with `RUN_MIGRATIONS_ON_START=false`.

## Last successful drill

| Date | Environment | RTO observed | Operator | Notes |
|------|-------------|--------------|----------|-------|
| _pending_ | staging | | | |
