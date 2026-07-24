import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingNoDemo, dismissBlockingShellOverlays } from './helpers/onboarding';
import { getLatestCourseId, uploadCourseFromPaste } from './helpers/libraryLifecycle';
import { buildCourseDeepLinkQuery } from '../src/lib/courseDeepLink';

const NOTES = `
# Deep Link Course

Topic alpha for path tab testing.
Topic beta for map and analytics coverage.
`.trim();

const TAB_MATRIX = [
  { tab: 'path', panel: 'course-panel-path' },
  { tab: 'map', panel: 'course-panel-map' },
  { tab: 'sources', panel: 'course-panel-sources' },
  { tab: 'analytics', panel: 'course-panel-analytics' },
] as const;

test.describe('C2 Course deep-link matrix', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingNoDemo(page);
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('nav-library').click();
    await uploadCourseFromPaste(page, NOTES);
    await page.getByRole('button', { name: /browse modules|περιήγηση/i }).click();
    await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });
  });

  for (const { tab, panel } of TAB_MATRIX) {
    test(`URL deep link opens course on ${tab} tab`, async ({ page }) => {
      test.setTimeout(180_000);
      const courseId = await getLatestCourseId(page);
      await page.goto(`/?${buildCourseDeepLinkQuery(courseId, tab)}`);
      await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId(panel)).toBeVisible();
      await expect(page.getByTestId(`course-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
    });
  }

  test('tab persistence survives reload on sources tab', async ({ page }) => {
    test.setTimeout(180_000);
    const courseId = await getLatestCourseId(page);
    await page.getByTestId('course-tab-map').click();
    await expect(page.getByTestId('course-panel-map')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('course-panel-map')).toBeVisible();

    await page.goto(`/?${buildCourseDeepLinkQuery(courseId, 'analytics')}`);
    await expect(page.getByTestId('course-panel-analytics')).toBeVisible();
  });

  test('unknown course id deep link falls back to library', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/?view=course&course=missing-course-id&tab=path');
    await expect(page.getByTestId('nav-library')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('course-page-stats')).toHaveCount(0);
  });
});
