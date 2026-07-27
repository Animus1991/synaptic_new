# Testcontainers Postgres (B6)

Server integration against real Postgres (+ pgvector image) without a shared external DB.

## Commands

```bash
cd server
npm run test:pg
```

Skip locally: `SKIP_TESTCONTAINERS=1 npm run test:pg`

CI job: `server-pg` in `.github/workflows/ci.yml` (requires Docker).

## What it covers

- Migrate all `server/migrations` onto `pgvector/pgvector:pg16`
- Register → list sessions → GET/PUT `/library` with ETag

Default `npm test` excludes this file (slow / Docker).
