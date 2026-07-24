# Synapse Learning — Institution One-Pager

**Version:** L8 · July 2026  
**Audience:** Deans, IT directors, LMS admins (K–12, higher ed, corporate L&D)

---

## What Synapse is

Synapse is an **integration-led AI study platform** — not a Canvas clone. It combines OCR ingestion, a 13-tool study workspace, FSRS spaced repetition, institution-grade LMS features, and Greek/EL localization in one product.

**Category:** AI-native learning workspace with LMS depth, not a single-purpose tool.

---

## Why institutions choose Synapse

| Need | Synapse answer |
| ---- | -------------- |
| **Student engagement** | 13-tool workspace (quiz, mind map, flashcards, agent, podcast) from one upload |
| **Faculty visibility** | Teacher dashboard, gradebook CSV, cohort heatmaps, NotebookLM bridge analytics |
| **LMS interoperability** | LTI 1.3 launch + AGS grade passback · SAML SSO · NRPS roster sync |
| **Compliance** | FERPA-oriented audit export · DPA template · data map · retention policy |
| **Greek market** | Full EL UI · OCR tuned for Greek academic PDFs |

---

## Deployment options

1. **Cloud SaaS** — Multi-tenant proxy + org accounts (recommended pilot)
2. **Self-hosted proxy** — Docker server with your LLM keys and SAML/LTI env vars
3. **Mobile companion** — Capacitor iOS/Android (offline queue + sync when signed in)

---

## Security & compliance (L8)

- **Audit export:** `GET /v1/orgs/:orgId/audit-logs/export` (CSV/JSON) for org administrators
- **Documentation:** `docs/compliance/DATA_MAP.md`, `RETENTION.md`, `DPA_TEMPLATE.md`
- **Privacy:** `docs/legal/PRIVACY_POLICY.md` — host at production URL before App Store submission

---

## Pilot timeline (typical)

| Week | Milestone |
| ---- | --------- |
| 1 | SAML/LTI config · org + class setup |
| 2 | Faculty training (teacher dashboard + gradebook) |
| 3–4 | Student rollout · student-org view + assignments |
| 5 | Analytics review · audit export for IT |

---

## Contact & demo

- **Demo flow:** Upload PDF → workspace tools → FSRS deck → teacher heatmap
- **Technical docs:** `ROADMAP.md`, `PRODUCT_SCALE_STATUS.md`, `L8_KICKOFF.md`
- **Store listing:** `mobile/store/` metadata (App Store / Play Console ready)

Replace placeholder URLs (`synapse.example.com`) before external distribution.
