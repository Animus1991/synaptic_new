# Privacy Policy — Synapse Learning

**Effective date:** 6 July 2026  
**App:** Synapse (`com.synapse.learning`) — web, iOS, and Android companion  
**Controller:** Synapse Learning — contact: privacy@synapse-learning.io

> Host this document at a public HTTPS URL before App Store / Play Store submission.  
> Canonical public URL is driven by `mobile/config/distribution.json`.

---

## 1. What we collect

### Account data
- Email address and hashed password (or Google OAuth subject when you sign in with Google)
- Subscription plan and billing identifiers (Stripe customer ID when applicable)
- API usage counters (request and token totals for quota enforcement)

### Study content you provide
- Uploaded files, course structures, notes, quiz sessions, Leitner decks, and workspace state
- Stored locally in your browser (IndexedDB / localStorage) and, when signed in, synced to our servers as JSON payloads (`account_libraries`, `account_sessions`)

### Institution data (schools / orgs)
- Organization name, class rosters, assignments, gradebook entries, and org membership roles
- LTI/SAML identifiers when your institution enables single sign-on
- **Audit logs** for mutating institution actions: account ID, action, resource path, IP address, timestamp (see FERPA/SOC2 export at `/v1/orgs/:orgId/audit-logs/export`)

### Automatically collected
- Device type and app version (diagnostics)
- Error reports if crash reporting (e.g. Sentry) is enabled in your deployment
- Rate-limit and security logs on our API

### AI processing
When you use Agent, OCR, transcription, or audio features, relevant excerpts of your content may be sent to configured upstream model providers (e.g. OpenAI) to generate responses. We do not use your content to train third-party foundation models unless you separately opt in to such a program.

---

## 2. How we use data

- Provide and improve the study workspace, sync, and institution features
- Authenticate users and enforce org role permissions (RBAC)
- Bill paid plans and prevent abuse (rate limits)
- Comply with legal obligations and respond to school audit requests

We do **not** sell personal information.

---

## 3. Legal bases (EEA/UK)

| Purpose | Basis |
| ------- | ----- |
| Account & sync | Contract |
| Institution admin & audit | Legitimate interest / contract with school |
| Billing | Contract |
| Security & abuse prevention | Legitimate interest |
| Optional analytics | Consent where required |

---

## 4. Sharing

We share data only with:
- **Infrastructure providers** (hosting, Postgres, Redis, object storage)
- **Payment processor** (Stripe) for subscriptions
- **AI upstream APIs** you configure for Agent/OCR/transcription
- **Your institution** when you access Synapse through school SSO or org membership

A subprocessors list is maintained in `docs/compliance/DATA_MAP.md`.

---

## 5. Retention

See `docs/compliance/RETENTION.md`. Summary:
- Active accounts: retained while the account exists
- Deleted accounts: purged within 30 days unless legal hold
- Audit logs: 24 months default for institution tenants
- Backups: encrypted, rotated per retention schedule

---

## 6. Your rights

Depending on jurisdiction you may request access, correction, deletion, portability, or restriction. Institution students: contact your school administrator first; org admins can export audit logs from the admin API.

Email privacy@synapse-learning.io or use in-app Settings → Account.

---

## 7. Children & schools

Synapse may be used by students under institution contracts. Schools act as independent controllers for roster and gradebook data. We process student data on the school's instructions under our DPA (`docs/compliance/DPA_TEMPLATE.md`).

---

## 8. Security

- TLS in transit; encrypted Postgres at rest (deployment-dependent)
- Tenant isolation for teacher classes and org RBAC
- JWT authentication with refresh token rotation
- Distributed rate limiting (Redis) in production

---

## 9. International transfers

If you are in the EEA/UK and data is processed in the US, we rely on Standard Contractual Clauses or equivalent safeguards in our DPA.

---

## 10. Changes

We will post updates at this URL and bump the effective date. Material changes to institution processing will be notified to org admins.

---

## 11. Contact

**Synapse Learning**  
privacy@synapse-learning.io
