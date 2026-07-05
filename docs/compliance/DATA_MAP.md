# Data processing map — Synapse Learning

**Version:** L8 · July 2026  
**Audience:** SOC2 auditors, institution IT, DPA reviewers  
**Related:** `docs/legal/PRIVACY_POLICY.md`, `docs/compliance/RETENTION.md`, `docs/compliance/DPA_TEMPLATE.md`

---

## System overview

| Component | Role | Data location |
| --------- | ---- | ------------- |
| Synapse web / mobile (Capacitor) | Client UI, offline cache | Device IndexedDB + localStorage |
| `server/` API proxy | Auth, sync, org, LTI, RAG, audit | Postgres + Redis |
| Upstream LLM (optional) | Agent, OCR vision, transcription summary | Provider region (configurable) |
| Stripe | Billing | Stripe PCI scope |
| Sentry (optional) | Crash reports | Sentry project region |

---

## Data categories & tables

| Category | Examples | Primary store | Subjects |
| -------- | -------- | ------------- | -------- |
| **Identity** | email, password hash, Google sub | `accounts`, OAuth tables | All users |
| **Study sync** | courses, files metadata, sessions, Leitner | `account_libraries`, `account_sessions` (JSONB) | Signed-in users |
| **Institution** | org name, memberships, roles | `organizations`, `org_memberships` | School users |
| **Classroom** | classes, roster, assignments, grades | `teacher_classes`, roster/gradebook stores | Teachers, students |
| **Audit / security** | action, IP, accountId, metadata | `audit_logs` | Org admins, auditors |
| **LTI** | deployment IDs, platform URLs | `lti_deployments` | Institution IT |
| **RAG** | text chunks, embeddings | `library_chunks` (pgvector) | Users with server RAG |
| **Async jobs** | transcribe status, filenames | `transcribe_jobs` | Users who upload media |
| **Billing** | Stripe customer ID, plan | `accounts.plan`, Stripe | Paying users |
| **Collab** | study room Yjs docs | `study_rooms`, `study_room_docs` | Room participants |

Client-only data (not in Postgres unless synced): full file blobs may remain on device; server stores library JSON references and optional chunk text for RAG.

---

## Processing purposes

| Purpose | Data used | Lawful basis (EEA) |
| ------- | --------- | ------------------ |
| Authentication & sync | Identity, library/session JSON | Contract |
| Adaptive study features | Session payloads, quiz outcomes | Contract |
| Institution admin | Org, class, gradebook, audit | Contract with school / legitimate interest |
| AI features | Content excerpts → upstream API | Contract / consent for optional features |
| Security | IP, audit logs, rate limits | Legitimate interest |
| Billing | Stripe IDs, usage JSON | Contract |

---

## Subprocessors (template — verify before signing DPA)

| Vendor | Function | Data shared |
| ------ | -------- | ----------- |
| Cloud host (e.g. AWS/GCP/Fly) | Compute, Postgres, Redis | All server-side categories |
| Stripe | Payments | Email, customer ID, plan |
| OpenAI or configured LLM | Agent/OCR/transcription | User content excerpts |
| Sentry (if enabled) | Error monitoring | Stack traces, device metadata |

Institution customers may request an updated subprocessor list 30 days before changes.

---

## Cross-border transfers

Default deployment region is set by the operator (`DATABASE_URL`, hosting choice). EEA personal data transferred to the US requires SCCs — see DPA Annex B.

---

## Data subject requests

| Request type | Handler |
| ------------ | ------- |
| Individual export/delete | Account settings + `privacy@` |
| Institution audit export | `GET /v1/orgs/:orgId/audit-logs/export` (org_admin) |
| Student under 18 (US K–12) | School admin as primary contact |

---

## Change log

| Date | Change |
| ---- | ------ |
| 2026-07-06 | L8 initial map — audit export, Capacitor mobile |
