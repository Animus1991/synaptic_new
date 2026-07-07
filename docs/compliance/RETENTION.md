# Data retention policy — Synapse Learning

**Version:** L8 · July 2026  
**Owner:** Security / platform engineering  
**Related:** `docs/compliance/DATA_MAP.md`, audit export API

---

## Principles

1. Retain the minimum data required for product function and legal obligation.
2. Institution audit logs are retained longer than ephemeral session caches.
3. Deletion requests propagate to Postgres; backup expiry follows schedule below.
4. Schools may negotiate custom retention in the DPA.

---

## Retention schedule

| Data type | Active retention | After account/org deletion | Notes |
| --------- | ---------------- | -------------------------- | ----- |
| **Account identity** (`accounts`) | Life of account | Hard delete within **30 days** | Stripe customer anonymized per Stripe policy |
| **Library / session sync** (`account_libraries`, `account_sessions`) | Life of account | Purged with account | JSON payloads |
| **Organization** (`organizations`, memberships) | Life of org contract | **90 days** soft archive then purge | Export audit logs first |
| **Classroom data** (classes, roster, assignments, grades) | Life of class/org | Purged with org or on class delete cascade | Teacher export CSV available |
| **Audit logs** (`audit_logs`) | **24 months** rolling | Export available; delete after period unless legal hold | SOC2/FERPA export via API |
| **LTI deployments** | Life of org | Deleted with org (CASCADE) | |
| **Transcribe jobs** | **90 days** after completion | Auto-purge job (operator cron) | Result text may be copied to user library |
| **RAG chunks** (`library_chunks`) | Life of indexed library item | Deleted when library item removed | Re-index on upload |
| **Refresh tokens** | Until revoked or **90 days** idle | N/A | Rotation on use |
| **Rate-limit counters** (Redis) | **1–60 minutes** TTL | N/A | Ephemeral |
| **Server logs** (stdout / aggregator) | **30 days** | N/A | No full library payload logging |
| **Backups** (Postgres) | **35 days** rolling | Encrypted; independent of primary delete | Restore-on-request for disaster recovery only |
| **Client IndexedDB** | Until user clears site data | User-controlled | Mobile WebView shares browser storage |

---

## Legal hold

When notified of litigation or regulatory inquiry, suspend automated purge for affected org IDs until legal releases hold.

---

## Implementation checklist

- [x] Cron: purge `audit_logs` older than 24 months (org-configurable in future)
- [x] Cron: purge completed `transcribe_jobs` > 90 days
- [x] Account deletion job: cascade library/session + anonymize audit `account_id` where retention requires log keep
- [ ] Document backup restore access (break-glass, two-person rule)

---

## Institution export before deletion

Org admins should run:

```http
GET /v1/orgs/{orgId}/audit-logs/export?format=csv&limit=5000
Authorization: Bearer {org_admin_jwt}
```

Store exports per school records-management policy.

---

## Change log

| Date | Change |
| ---- | ------ |
| 2026-07-06 | L8 initial policy |
