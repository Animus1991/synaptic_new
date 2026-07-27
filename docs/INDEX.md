# Documentation index (canonical entry)

**Baseline:** `synaptic_new` @ `40a1098`  
**Backlog:** [UPGRADE_BACKLOG.md](./UPGRADE_BACKLOG.md)

This file is the only recommended entry point for humans and agents. Historical master plans live under [`history/README.md`](./history/README.md) (stubs remain at old paths for link stability).

## Live specifications

| Doc | Role |
|-----|------|
| [../README.md](../README.md) | Product overview, quick start |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | System layout, client/server boundaries |
| [../SECURITY.md](../SECURITY.md) | Threat model, controls, security roadmap |
| [../ROADMAP.md](../ROADMAP.md) | Shipped vs remaining product/ops gaps |
| [../DEPLOYMENT.md](../DEPLOYMENT.md) | Deploy, Helm, migrations Job, ops |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | PR norms, tests, doc rules |
| [../CHANGELOG.md](../CHANGELOG.md) | Release notes |
| [UPGRADE_BACKLOG.md](./UPGRADE_BACKLOG.md) | W0–D execution backlog (this program) |
| [GAP_AUDIT.md](./GAP_AUDIT.md) | Gap register vs scale goals |
| [runbooks/jwt-rotation.md](./runbooks/jwt-rotation.md) | JWT / secret rotation playbook |
| [runbooks/backup-restore.md](./runbooks/backup-restore.md) | Backup restore drill |
| [plugins.md](./plugins.md) | Plugin API / sandbox (D7 draft) |
| [DEPENDABOT_POLICY.md](./DEPENDABOT_POLICY.md) | Dependabot merge cadence |
| [runbooks/pwa-chunk-recovery.md](./runbooks/pwa-chunk-recovery.md) | PWA/SW chunk recovery |

## History (do not treat as active plans)

All `*PLAN*`, `*BLUEPRINT*`, and mockup fidelity plans are archived in [`history/README.md`](./history/README.md). Prefer [UPGRADE_BACKLOG.md](./UPGRADE_BACKLOG.md) over inventing a new “master plan #17”.

## Doc-lint

`npm run doc-lint` requires this file and the live-spec set above. Historical stubs must point into `history/`.
