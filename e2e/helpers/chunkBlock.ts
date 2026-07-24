import { expect, type Page, type Route } from '@playwright/test';

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
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
  return {
    setBlocking: (value: boolean) => {
      blocking = value;
    },
  };
}
