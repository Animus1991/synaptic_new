import type { Page, Route } from '@playwright/test';

/**
 * Match a Vite/dev lazy module file without catching sibling libs
 * (e.g. `activityAnalytics.ts` must NOT match `Analytics`).
 */
export function urlMatchesModuleFile(url: string, fileBase: string): boolean {
  const u = url.replace(/\\/g, '/');
  // Avoid false positives like activityAnalytics.ts when matching Analytics.
  const leaf = u.split('/').pop()?.split('?')[0] ?? '';
  if (new RegExp(`^${fileBase}\\.[tj]sx?$`, 'i').test(leaf)) return true;
  if (new RegExp(`^${fileBase}-[A-Za-z0-9_-]+\\.js$`, 'i').test(leaf)) return true;
  // Vite may serve as /@id/... or keep path + ?import / &t=
  if (new RegExp(`(?:^|/)(?:src/)?(?:components/)?(?:workspace/)?${fileBase}\\.[tj]sx?(?:\\?|&|$)`, 'i').test(u)) {
    return !new RegExp(`[A-Za-z0-9_]${fileBase}\\.`, 'i').test(u);
  }
  return false;
}

/**
 * Install chunk block + session guards *before* first navigation so idle prefetch
 * cannot cache the target module. Prefer this over reload-after-shell.
 *
 * Uses HTTP 500 fulfill (not abort): Chromium/Vite can leave `import()` pending
 * forever on `route.abort()`, which strands Suspense on a Loading fallback.
 */
export async function installChunkAbort(
  page: Page,
  shouldAbort: (url: string) => boolean,
): Promise<{ setBlocking: (value: boolean) => void }> {
  let blocking = true;
  await page.addInitScript(() => {
    try {
      // Skip product tour so overlays never block nav clicks in these suites.
      localStorage.setItem('synapse:product-tour-complete-v1', 'true');
      // Fast-fail chunk retries so ErrorBoundary / boot shell appears promptly.
      sessionStorage.setItem('synapse:e2e-chunk-abort', '1');
    } catch {
      /* ignore */
    }
    const flows = [
      'study-workspace',
      'study-workspace-body',
      'cognitive-reader',
      'analytics',
      'lesson',
      'agent',
      'teacher',
      'practical-lesson',
      'review-session',
    ];
    for (const flow of flows) {
      try {
        sessionStorage.setItem(`synapse:chunk-hard-reload:${flow}`, '1');
      } catch {
        /* ignore */
      }
    }
  });
  await page.route('**/*', async (route: Route) => {
    if (blocking && shouldAbort(route.request().url())) {
      return route.fulfill({
        status: 500,
        contentType: 'text/plain',
        body: 'e2e-chunk-block',
      });
    }
    return route.continue();
  });
  return {
    setBlocking: (value: boolean) => {
      blocking = value;
    },
  };
}
