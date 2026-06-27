/**
 * Per-flow dynamic-import failure coverage.
 *
 * For each lazy entry point (Analytics, LessonView, StudyWorkspace → which
 * carries WorkspaceDock), we:
 *   1. Abort the chunk request on first load.
 *   2. Assert the ErrorBoundary fallback (Try again / Reload) is rendered —
 *      proving no user gets stranded on a blank Suspense fallback.
 *   3. Capture navigation count BEFORE clicking "Try again", unblock the
 *      route, click "Try again", and assert that navigation count did NOT
 *      increment — i.e. recovery happens WITHOUT a full page reload.
 *   4. Assert the destination view actually mounts.
 *
 * Also doubles as the global ErrorBoundary smoke: a failed React.lazy
 * import surfaces through the boundary, the recovery affordance is visible,
 * and retry restores the subtree.
 */

import { test, expect, type Page, type Route } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const TRY_AGAIN = /try again|δοκιμάστε ξανά/i;
const RELOAD = /^reload$|επαναφόρτωση/i;

async function trackNavigations(page: Page): Promise<() => number> {
  await page.addInitScript(() => {
    (window as unknown as { __navCount?: number }).__navCount =
      ((window as unknown as { __navCount?: number }).__navCount ?? 0) + 1;
  });
  return async () => {
    const n = await page.evaluate(
      () => (window as unknown as { __navCount?: number }).__navCount ?? 0,
    );
    return n;
  };
}

interface FlowCase {
  name: string;
  needle: string;
  excludes?: string[];
  trigger: (page: Page) => Promise<void>;
  mountedTestId: string;
}

const FLOWS: FlowCase[] = [
  {
    name: 'Analytics',
    needle: 'Analytics',
    excludes: ['analytics.spec'],
    trigger: async (page) => {
      await page.getByTestId('nav-analytics').click();
    },
    mountedTestId: 'analytics-view',
  },
  {
    name: 'LessonView',
    needle: 'LessonView',
    trigger: async (page) => {
      // Open the first available course / continue → triggers LessonView lazy chunk.
      const continueBtn = page.getByTestId('library-continue').first();
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
      } else {
        await page.getByTestId('nav-tasks').click();
        await page.getByTestId('task-start').first().click().catch(() => {});
      }
    },
    mountedTestId: 'lesson-view',
  },
  {
    name: 'StudyWorkspace (WorkspaceDock)',
    needle: 'StudyWorkspace',
    excludes: ['StudyWorkspaceLazy', 'StudyWorkspaceGate'],
    trigger: async (page) => {
      const openWorkspace = page.getByTestId('dashboard-open-workspace').first();
      if (await openWorkspace.isVisible().catch(() => false)) {
        await openWorkspace.click();
      } else {
        await page.getByTestId('nav-dashboard').click();
        await page.getByTestId('dashboard-open-workspace').first().click().catch(() => {});
      }
    },
    mountedTestId: 'workspace-dock',
  },
];

for (const flow of FLOWS) {
  test(`${flow.name}: chunk failure shows fallback and retries without full reload`, async ({ page }) => {
    const readNavCount = await trackNavigations(page);

    let blocking = true;
    await page.route('**/*', (route: Route) => {
      const url = route.request().url();
      const hit = url.includes(flow.needle) && !(flow.excludes ?? []).some((e) => url.includes(e));
      if (blocking && hit) return route.abort('failed');
      return route.continue();
    });

    await page.goto('/');
    await skipOnboardingToLibrary(page);

    const navBeforeTrigger = await readNavCount();
    await flow.trigger(page);

    // Fallback UI MUST appear — Try again + Reload buttons present.
    const tryAgain = page.getByRole('button', { name: TRY_AGAIN }).first();
    await expect(tryAgain).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: RELOAD }).first()).toBeVisible();

    const navBeforeRetry = await readNavCount();

    // Unblock and retry — must remount in-place, NO full navigation.
    blocking = false;
    await tryAgain.click();

    await expect(page.getByTestId(flow.mountedTestId)).toBeVisible({ timeout: 30_000 });

    const navAfterRetry = await readNavCount();
    expect(
      navAfterRetry,
      `${flow.name}: Try again must NOT trigger a full reload (navCount before=${navBeforeRetry}, after=${navAfterRetry}, baseline=${navBeforeTrigger})`,
    ).toBe(navBeforeRetry);
  });
}

test('global ErrorBoundary surfaces fallback on lazy render failure and recovers safely', async ({ page }) => {
  // Use the Analytics lazy entry as a deterministic lazy render error: by
  // aborting its module fetch React.lazy rejects with a real Error, which
  // bubbles into the closest ErrorBoundary. This exercises the same path a
  // synchronous render-throw would, without requiring app-side test hooks.
  const readNavCount = await trackNavigations(page);
  let blocking = true;
  await page.route('**/*', (route: Route) => {
    const url = route.request().url();
    if (blocking && url.includes('Analytics')) return route.abort('failed');
    return route.continue();
  });

  await page.goto('/');
  await skipOnboardingToLibrary(page);
  await page.getByTestId('nav-analytics').click();

  const tryAgain = page.getByRole('button', { name: TRY_AGAIN }).first();
  await expect(tryAgain).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('button', { name: RELOAD }).first()).toBeVisible();

  const before = await readNavCount();
  blocking = false;
  await tryAgain.click();
  await expect(tryAgain).toBeHidden({ timeout: 25_000 });
  const after = await readNavCount();
  expect(after, 'global ErrorBoundary retry must be in-place').toBe(before);

  // App is still responsive — sibling navigation works after recovery.
  await page.getByTestId('nav-library').click();
  await expect(page.getByTestId('nav-library')).toHaveAttribute('aria-current', /page|true/);
});
