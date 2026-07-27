# Dependabot merge policy (ops)

## Cadence

- **Weekly** Dependabot PRs for npm (client + `server/` + `ocr-server/`).
- Security advisories: merge within **7 days** for high/critical after CI green.

## Merge rules

1. CI must be green: unit, typecheck, e2e (as required by branch protection), audit, gitleaks, CodeQL, Trivy.
2. Prefer patch/minor auto-merge when available; major bumps need human review + changelog note.
3. Do not batch unrelated majors in one PR.
4. After merge, smoke staging login + `/v1/chat/completions` moderation path.

## Anchors

- `.github/workflows/ci.yml`, `codeql.yml`, `trivy.yml`, `secret-scan.yml`
- `docs/UPGRADE_BACKLOG.md` A1
