# PWA / service worker update & chunk recovery (D ops note)

## Symptoms

- White screen after deploy; console shows chunk load errors (`Failed to fetch dynamically imported module`).
- Stale SW serving old `index.html` that references removed hashed assets.

## Operator steps

1. Confirm new Netlify/CDN deploy is live.
2. Instruct users: hard refresh; if PWA installed, open app → clear site data / unregister SW once.
3. Ensure deploy sets cache headers: `index.html` no-cache; hashed assets immutable.
4. Optional: bump SW `CACHE_VERSION` on each release if a custom SW is introduced.

## Related

- Lazy chunk audit: Wave B4 (`docs/UPGRADE_BACKLOG.md`).
- Design clarity contracts remain mandatory (D9).
