# Primer Minimal — OPT-M20 captures

Local PNG dumps for human visual QA against `docs/PRIMER_MINIMAL_SCREENSHOT_MATRIX.md`.

## Generate

```bash
npm run capture:primer-minimal
```

Requires Chromium for Playwright (`npx playwright install chromium` once). Reuses `npm run dev` on `:5173` when already running.

## Review

1. Open PNGs + `MANIFEST.md` (lists skips for role-gated surfaces).
2. Mark Pass? ☐ → ☑ in the matrix doc.
3. Do **not** treat this as CI visual regression — engineering gate is human sign-off.
