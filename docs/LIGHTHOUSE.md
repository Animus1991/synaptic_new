# Lighthouse CI budgets (B5)

Surfaces under test (after `npm run build:fast`):

| URL | Intent |
|-----|--------|
| `/` | Landing |
| `/?view=dashboard` | Dashboard (seeded `synapse:user-profile-v1`) |
| `/?demo=1` | Demo / workspace-adjacent path |

## Commands

```bash
npm run test:lhci
# or: npm run build:fast && npm run lhci
```

CI job: `lighthouse` in `.github/workflows/ci.yml` (uploads `.lighthouseci/`).

## Assertions

See `lighthouserc.cjs`. Performance floor is intentionally moderate for SPA + CI Chrome;
fail on severe regressions only. Wave E14 raises **accessibility** to `error` / minScore **0.95**.

## Rollback

Revert `lighthouserc.cjs` thresholds or skip job with `LHCI_SKIP=1` (not wired by default).
