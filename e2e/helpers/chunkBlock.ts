import type { Page, Route } from '@playwright/test';

/**
 * Match a Vite/dev lazy module file without catching sibling libs
 * (e.g. `activityAnalytics.ts` must NOT match `Analytics`).
 */
export function urlMatchesModuleFile(url: string, fileBase: string): boolean {
  const u = url.replace(/\\/g, '/');
  // /components/Analytics.tsx(?query) — slash before the file base is required
  if (new RegExp(`/${fileBase}\\.[tj]sx?(?:\\?|$)`, 'i').test(u)) return true;
  // production hashed chunk: Analytics-a1b2c3de.js
  if (new RegExp(`/${fileBase}-[A-Za-z0-9_-]+\\.js(?:\\?|$)`).test(u)) return true;
  return false;
}

/**
 * Install abort + session guards *before* first navigation so idle prefetch
 * cannot cache the target module. Prefer this over reload-after-shell.
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
  await page.route('**/*', (route: Route) => {
    if (blocking && shouldAbort(route.request().url())) return route.abort('failed');
    return route.continue();
  });
  return {
    setBlocking: (value: boolean) => {
      blocking = value;
    },
  };
}
