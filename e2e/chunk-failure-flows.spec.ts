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

import { test, expect, type Page } from '@playwright/test';
import { skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';
import { installChunkAbort, urlMatchesModuleFile } from './helpers/chunkBlock';

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
  /** Exact module file base (not a substring of *Analytics.ts libs). */
  moduleFile: string;
  trigger: (page: Page) => Promise<void>;
  mountedTestId: string;
}

const FLOWS: FlowCase[] = [
  {
    name: 'Analytics',
    moduleFile: 'Analytics',
    trigger: async (page) => {
      await page.getByTestId('nav-analytics').click();
    },
    mountedTestId: 'analytics-page',
  },
  {
    name: 'LessonView',
    moduleFile: 'LessonView',
    trigger: async (page) => {
      const continueBtn = page.getByTestId('library-continue').first();
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
      } else {
        await page.getByTestId('nav-tasks').click();
        await page.getByTestId('task-start').first().click().catch(() => {});
      }
    },
    // LessonView mount surfaces via course/lesson chrome rather than a dedicated root id.
    mountedTestId: 'platform-main',
  },
  {
    name: 'StudyWorkspace (WorkspaceDock)',
    moduleFile: 'StudyWorkspace',
    trigger: async (page) => {
      const openWorkspace = page.getByTestId('dashboard-open-workspace').first();
      if (await openWorkspace.isVisible().catch(() => false)) {
        await openWorkspace.click();
      } else {
        await page.getByTestId('nav-dashboard').click();
        await page.getByTestId('dashboard-open-workspace').first().click().catch(() => {});
      }
    },
    mountedTestId: 'study-workspace',
  },
];

for (const flow of FLOWS) {
  test(`${flow.name}: chunk failure shows fallback and retries without full reload`, async ({ page }) => {
    test.setTimeout(90_000);
    const readNavCount = await trackNavigations(page);
    const { setBlocking } = await installChunkAbort(page, (url) =>
      urlMatchesModuleFile(url, flow.moduleFile),
    );

    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);

    const navBeforeTrigger = await readNavCount();
    await flow.trigger(page);

    const tryAgain = page.getByRole('button', { name: TRY_AGAIN }).first();
    await expect(tryAgain).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: RELOAD }).first()).toBeVisible();

    const navBeforeRetry = await readNavCount();
    setBlocking(false);
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
  test.setTimeout(90_000);
  const readNavCount = await trackNavigations(page);
  const { setBlocking } = await installChunkAbort(page, (url) =>
    urlMatchesModuleFile(url, 'Analytics'),
  );

  await page.goto('/');
  await skipOnboardingToLibrary(page);
  await dismissBlockingShellOverlays(page);

  await page.getByTestId('nav-analytics').click();

  const tryAgain = page.getByRole('button', { name: TRY_AGAIN }).first();
  await expect(tryAgain).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('button', { name: RELOAD }).first()).toBeVisible();

  const before = await readNavCount();
  setBlocking(false);
  await tryAgain.click();
  await expect(tryAgain).toBeHidden({ timeout: 25_000 });
  const after = await readNavCount();
  expect(after, 'global ErrorBoundary retry must be in-place').toBe(before);

  await page.getByTestId('nav-library').click();
  await expect(page.getByTestId('nav-library')).toHaveAttribute('aria-current', /page|true/);
});
