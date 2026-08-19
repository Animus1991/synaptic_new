# Backup restore drill (D6)

**Goal:** prove that Postgres (and Redis, when used for rate limits / BullMQ) can
be restored within the RTO/RPO targets below, with no silent data loss.

## RTO / RPO targets

| Datastore | RPO (max data loss) | RTO (max downtime) | Basis |
|-----------|---------------------|--------------------|-------|
| Postgres (primary) | ≤ 24h (daily snapshot) or ≤ 5min (PITR/WAL if enabled) | ≤ 2h | Snapshot cadence + restore drill |
| Redis (ephemeral: rate limits, transient queue state) | Best-effort — treated as regenerable | ≤ 30min | No durable user data; rebuild empty |

Redis holds only rate-limit counters and in-flight queue state; losing it degrades
gracefully (limits reset, jobs re-enqueue), so it is **not** on the erasure/portability
critical path. Postgres is the only store with irreplaceable user data.

## Cadence

- Quarterly minimum; **and** after any major schema migration (Wave B6+ / new
  `server/migrations/*.cjs`).
- Record the **last-success date** in the table below (evidence for SOC2/DPA D4).

## Backup inventory (must all survive a restore)

Mirror the tables touched by the account-deletion transaction
(`server/src/store/postgres.ts deleteAccount`) plus operational tables:

- `accounts`, `auth_tokens`
- `account_libraries`, `account_sessions`
- `library_chunks` (pgvector), `library_thumbnails`
- retention / audit tables (`audit_logs`, transcribe jobs)
- teacher/org/LTI tables (classes, organizations, assignment submissions, AGS line items)
- MCP OAuth (`google_oauth_tokens`, `mcp_oauth_clients`), study rooms

## Procedure (staging)

1. Take/identify the latest automated backup (provider snapshot or `pg_dump -Fc`).
   Note its timestamp — this fixes the **RPO** you are proving.
2. Restore into a **disposable** Postgres instance (never production). Start a
   wall-clock timer to measure **RTO**.
3. Point a one-off API pod / Job at the restored `DATABASE_URL`.
4. Run `npm run migrate` (or the Helm migrate Job). It should be a no-op or apply
   only pending migrations — a large diff means the backup predates current schema.
5. Smoke checks:
   - `/live`, `/ready` return healthy.
   - `POST /auth/login` + `GET /auth/me` for a known seed account.
   - `GET` library → non-empty for a seeded account.
   - Spot-check row counts vs the backup inventory above:
     `SELECT count(*) FROM accounts;` etc.
6. Stop the timer, record RTO, tear down the disposable instance and its data.

## Pass criteria

- Restore completes within the documented **RTO** (≤ 2h Postgres).
- Data recency is within the documented **RPO**.
- No silent data loss vs the backup inventory (row counts within expected delta).
- Application boots with `RUN_MIGRATIONS_ON_START=false` (migrations are an explicit
  step, never implicit on boot).

## Failure handling

- If migrations apply a large diff, capture the backup's schema version and file a
  follow-up: automated backups must post-date the latest migration.
- If a smoke check fails, do **not** mark the drill successful; open an incident and
  attach logs to the evidence folder referenced in `docs/compliance/SOC2_DPA.md`.

## Last successful drill

| Date | Environment | RPO proven | RTO observed | Operator | Notes |
|------|-------------|-----------|--------------|----------|-------|
| _pending_ | staging | | | | |
