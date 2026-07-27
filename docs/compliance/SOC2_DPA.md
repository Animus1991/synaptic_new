# SOC 2 / DPA draft (D4)

**Status:** draft for operators — not a completed certification package.  
**ROADMAP:** App Store, SOC2/DPA, GTM remain open product-ops items.

## Data map (high level)

| Data class | Store | Retention notes |
|------------|-------|-----------------|
| Account email, password hash, plan | Postgres `accounts` | Until account delete (GDPR) |
| Refresh / reset / verify tokens | Postgres `auth_tokens` | TTL + purge job |
| Library / session sync payloads | Postgres JSONB | Until delete |
| LLM proxy prompts | Upstream vendor; optional moderation audit logs | Policy-dependent |
| Billing | Stripe customer id on account | Stripe + local plan |
| Telemetry | OTel exporter when enabled | Staging/prod collectors |

## Control themes (mapping)

| Theme | Current anchors | Gap |
|-------|-----------------|-----|
| Access control | JWT access + opaque refresh, quotas | Session revoke UX (A4) |
| Change management | CI typecheck/unit/e2e/a11y | CodeQL/Trivy required (A1) |
| Encryption in transit | TLS at edge (DEPLOYMENT) | Document cert ownership |
| Secrets | K8s secret + Gitleaks | Rotation runbook (A7) |
| Availability | Helm multi-replica, migrate Job | Backup drill (D6) |
| Privacy | Export/delete in Settings | Formal DPA template with counsel |

## DPA next steps

1. Legal review of subprocessors (OpenAI/compatible upstream, Stripe, email provider, hosting).
2. Publish customer-facing DPA PDF; link from privacy policy.
3. Evidence folder: access reviews, backup drills, incident log.
