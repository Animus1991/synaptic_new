# Data Processing Agreement (template)

**Synapse Learning — Institution DPA**  
**Version:** L8 · July 2026  
**Status:** Template — legal review required before execution

This Data Processing Agreement ("DPA") forms part of the agreement between **Synapse Learning** ("Processor") and **\[Institution Name\]** ("Controller") for use of the Synapse platform.

---

## 1. Definitions

- **Personal Data:** information relating to an identified or identifiable individual processed on behalf of Controller.
- **Services:** Synapse web/mobile application, API, LTI/SAML integrations, and org admin features.
- **Subprocessor:** third party engaged by Processor to process Personal Data.

Terms capitalized but not defined here have meanings under applicable Data Protection Laws (GDPR, UK GDPR, FERPA where applicable).

---

## 2. Scope & roles

Controller instructs Processor to process Personal Data of students, teachers, and staff solely to provide the Services described in the Order Form and `docs/compliance/DATA_MAP.md`.

| Role | Party |
| ---- | ----- |
| Controller | Institution |
| Processor | Synapse Learning |

For K–12 US deployments, Controller remains responsible for parental consent and school official designation under FERPA.

---

## 3. Processor obligations

Processor shall:

1. Process Personal Data only on documented instructions from Controller (including this DPA and product configuration).
2. Ensure personnel are bound by confidentiality.
3. Implement appropriate technical and organizational measures (see Annex A).
4. Assist Controller with data subject requests within **30 days** of notice.
5. Notify Controller of a Personal Data breach without undue delay and within **72 hours** of becoming aware.
6. Delete or return Personal Data at termination per `docs/compliance/RETENTION.md`, unless law requires retention.
7. Make available information necessary to demonstrate compliance and allow audits once per year on **30 days** notice.

---

## 4. Subprocessors

Controller authorizes Processor to engage Subprocessors listed in `docs/compliance/DATA_MAP.md`. Processor will notify Controller **30 days** before adding or replacing a Subprocessor. Controller may object on reasonable grounds.

---

## 5. International transfers

Where Personal Data is transferred outside the EEA/UK, parties shall execute Standard Contractual Clauses (Annex B) or rely on another valid transfer mechanism.

---

## 6. Audit & FERPA

Processor provides:

- `GET /v1/orgs/:orgId/audit-logs` (JSON) and `/export?format=csv|json` for org administrators
- Documentation: DATA_MAP, RETENTION, this DPA

Controller is responsible for access control to org_admin credentials.

---

## 7. Liability & term

Liability caps and term follow the main Services agreement. This DPA survives termination until Personal Data is deleted or returned.

---

## Annex A — Security measures (summary)

- TLS 1.2+ for data in transit
- Postgres with encryption at rest (hosting-dependent)
- Tenant isolation: `requireTeacherClass`, org RBAC
- JWT auth + refresh rotation
- Redis-backed distributed rate limits in production
- Audit logging on mutating institution routes
- Optional SOC2 Type II report (when available)

---

## Annex B — Standard Contractual Clauses

\[Attach executed SCC modules per EU Commission decision — Module 2 Controller-to-Processor\]

---

## Annex C — Details of processing

| Item | Detail |
| ---- | ------ |
| Subject matter | Educational study platform |
| Duration | Term of institution subscription |
| Nature | Storage, sync, analytics, AI-assisted study on Controller's materials |
| Categories of data subjects | Students, teachers, administrators |
| Categories of data | See DATA_MAP.md |
| Special categories | Not intentionally collected; Controller shall not upload health data |

---

## Signatures

| | Controller | Processor |
| - | ---------- | --------- |
| Name | | |
| Title | | |
| Date | | |

---

*Replace placeholders, attach SCCs, and obtain counsel review before customer signature.*
