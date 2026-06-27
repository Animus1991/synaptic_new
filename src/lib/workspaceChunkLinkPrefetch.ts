/**
 * B11 — inject `<link rel="prefetch">` for hashed workspace entry chunks (from build manifest).
 */

const MANIFEST_URL = '/workspace-entry-chunks.json';
let linkPrefetchStarted = false;

export function injectWorkspaceEntryLinkPrefetch(): void {
  if (linkPrefetchStarted || typeof document === 'undefined') return;
  linkPrefetchStarted = true;

  void fetch(MANIFEST_URL)
    .then((res) => (res.ok ? res.json() : null))
    .then((urls: unknown) => {
      if (!Array.isArray(urls)) return;
      for (const href of urls) {
        if (typeof href !== 'string' || !href.startsWith('/')) continue;
        if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) continue;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'script';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    })
    .catch(() => {
      /* non-fatal — dynamic import prefetch still runs */
    });
}

/** Reset for unit tests. */
export function resetWorkspaceLinkPrefetchForTests(): void {
  linkPrefetchStarted = false;
}
