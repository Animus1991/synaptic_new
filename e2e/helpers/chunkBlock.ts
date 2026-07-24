import { expect, type Page, type Route } from '@playwright/test';
import { dismissBlockingShellOverlays } from './onboarding';

/**
 * Match a Vite/dev lazy module file without catching sibling libs
 * (e.g. `activityAnalytics.ts` must NOT match `Analytics`).
 */
export function urlMatchesModuleFile(url: string, fileBase: string): boolean {
  const u = url.replace(/\\/g, '/');
  return new RegExp(
    `/${fileBase}(?:\\.[tj]sx?(?:\\?|$)|-[A-Za-z0-9_-]+\\.js(?:\\?|$))`,
  ).test(u);
}

/**
 * Idle prefetch (preloadCriticalChunks) can resolve lazy modules before a
 * Playwright route abort is installed. Arm the abort, then reload so the next
 * import()/prefetch hits a failed network fetch and surfaces ErrorBoundary UI.
 */
export async function armChunkAbortAfterShell(
  page: Page,
  shouldAbort: (url: string) => boolean,
): Promise<{ setBlocking: (value: boolean) => void }> {
  let blocking = true;
  await page.route('**/*', (route: Route) => {
    if (blocking && shouldAbort(route.request().url())) return route.abort('failed');
    return route.continue();
  });
  // Prevent lazyWithRetry from treating our intentional abort as a stale-chunk
  // hard-reload (which would loop / hide ErrorBoundary + boot-shell UI).
  await page.addInitScript(() => {
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
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 20_000 });
  await dismissBlockingShellOverlays(page);
  return {
    setBlocking: (value: boolean) => {
      blocking = value;
    },
  };
}
