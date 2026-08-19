# SOC 2 / DPA (D4)

**Status:** operator-facing control narrative and evidence map. This is **not** a
completed SOC 2 audit or a counsel-signed DPA — those require an external auditor
and legal review (tracked below). The engineering controls it references are
shipped; the certification/legal wrappers are not.  
**ROADMAP:** App Store submission, SOC 2 attestation, and GTM remain the open
product-ops items.

## Data map (high level)

| Data class | Store | Retention notes |
|------------|-------|-----------------|
| Account email, password hash (`$scrypt-v2$…`), plan | Postgres `accounts` | Until account delete (GDPR) |
| Refresh / reset / verify tokens, session records | Postgres `auth_tokens` | TTL + retention purge job |
| Library / session sync payloads | Postgres `account_libraries` / `account_sessions` (JSONB) | Until delete |
| Note embeddings / thumbnails | Postgres `library_chunks` (pgvector), `library_thumbnails` | Until delete |
| Audit logs | Postgres `audit_logs` | 24-month retention (`retentionPolicy.ts`) |
| Transcribe jobs | queue store | 90-day retention |
| LLM proxy prompts | Upstream vendor; optional moderation audit logs | Policy-dependent; not persisted by default |
| Billing | Stripe customer id on account | Stripe + local plan |
| Telemetry | OTel exporter when enabled | Staging/prod collectors |

## Control themes (mapping)

| Theme | Current anchors (shipped) | Residual gap |
|-------|---------------------------|--------------|
| Access control | JWT access + opaque refresh, per-account quotas, session list/revoke UX (Wave A4) | Periodic access review evidence |
| Change management | CI typecheck/unit/e2e/a11y **+ CodeQL + Trivy + Gitleaks** (Wave A1) | External auditor walkthrough |
| Encryption in transit | TLS at edge (see `DEPLOYMENT.md`) | Document cert ownership/renewal owner |
| Secrets | K8s secret + Gitleaks + **rotation runbook** (Wave A7, `runbooks/jwt-rotation.md`) | Automated rotation cadence |
| Availability / recovery | Helm multi-replica, explicit migrate Job, **backup-restore drill** (D6, `runbooks/backup-restore.md`) | First signed-off drill result |
| Privacy / data subject rights | Export + delete in Settings; `deleteAccountData` full erasure (D5) with regression tests | Counsel-signed DPA + subprocessor list publication |
| Observability | web-vitals RUM, OTel (staging), `/live` + `/ready` | Prod OTel enablement sign-off |

## Data subject rights (GDPR — shipped)

- **Right to access / portability:** `GET /v1/account/export` →
  `exportAccountData` returns a credential-free JSON bundle (account, library,
  session, Google status, vector-chunk count). Never includes password hash or
  raw OAuth tokens.
- **Right to erasure:** `DELETE /v1/account` (requires `confirmEmail`) →
  `deleteAccountData` erases account, library, session, thumbnails, vector chunks,
  Google tokens, issued tokens, and anonymises audit logs. In Postgres the row
  deletions run in a single atomic transaction (`store/postgres.ts deleteAccount`).
- **Coverage lock:** `server/src/lib/accountLifecycle.test.ts`.

## Subprocessor register (to publish in the DPA)

| Subprocessor | Purpose | Data shared |
|--------------|---------|-------------|
| LLM provider (OpenAI-compatible upstream) | Model inference via server proxy | Prompt content at request time |
| Stripe | Billing | Email, customer id, payment metadata |
| Email provider (SMTP) | Transactional email (verify/reset) | Email address |
| Hosting / Postgres provider | Application + primary datastore | All persisted data classes above |
| OTel collector (when enabled) | Telemetry | Operational metrics/traces (no note content) |

Keep this table in sync with `server/src/config.ts` provider wiring before
publishing the customer-facing DPA.

## Incident response pointer

Security incidents (including a failed backup drill or suspected data exposure)
follow `SECURITY.md`. Attach evidence (logs, timeline, remediation) to the
evidence index below.

## Evidence index (fill in as drills/reviews complete)

| Control | Evidence artefact | Owner | Last updated |
|---------|-------------------|-------|--------------|
| Backup recovery | `runbooks/backup-restore.md` drill table | Ops | _pending_ |
| Secret rotation | `runbooks/jwt-rotation.md` execution log | Ops | _pending_ |
| Access review | Quarterly account/role review notes | Ops | _pending_ |
| Data-subject requests | Export/delete request log | Support | _pending_ |

## DPA next steps

1. Legal review of the subprocessor register above (upstream LLM, Stripe, email,
   hosting, telemetry).
2. Publish the customer-facing DPA PDF; link it from the privacy policy.
3. Populate the evidence index with the first backup drill, rotation, and access
   review.
