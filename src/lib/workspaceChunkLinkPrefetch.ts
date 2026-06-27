/**
 * B11 — inject `<link rel="modulepreload">` / `prefetch` for hashed workspace entry chunks.
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
      urls.forEach((href, index) => {
        if (typeof href !== 'string' || !href.startsWith('/')) return;
        if (document.querySelector(`link[href="${href}"]`)) return;
        const link = document.createElement('link');
        const isWorker = /workspace\.worker/i.test(href);
        link.rel = isWorker ? 'prefetch' : index < 2 ? 'modulepreload' : 'prefetch';
        link.as = 'script';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    })
    .catch(() => {
      /* non-fatal — dynamic import prefetch still runs */
    });
}

/** Reset for unit tests. */
export function resetWorkspaceLinkPrefetchForTests(): void {
  linkPrefetchStarted = false;
}
