import { test, expect, type Page } from '@playwright/test';
import { clearAppStorage, skipOnboardingNoDemo, dismissBlockingShellOverlays } from './helpers/onboarding';

const NOTES = `
# Behavioral Economics

Waiting costs shape intertemporal choice.
Present bias can explain why people prefer smaller sooner rewards.
Loss aversion affects risk preferences under uncertainty.
`.trim();

async function uploadCourse(page: Page): Promise<string> {
  await page.getByTestId('nav-library').click();
  await page.getByTestId('library-upload').click();
  await page.getByTestId('upload-paste').fill(NOTES);
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('upload-generate').click();
  await expect(page.getByTestId('upload-modal')).toBeHidden({ timeout: 120_000 });

  await expect(page.getByTestId('post-upload-banner')).toBeVisible({ timeout: 30_000 });
  const courseTitle =
    (await page.getByTestId('post-upload-banner').locator('p.text-sm.font-semibold').textContent())?.trim() ?? '';
  await page.getByRole('button', { name: /browse modules|περιήγηση/i }).click();
  await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });
  return courseTitle;
}

async function openCourseByTitle(page: Page, courseTitle: string) {
  const card = page.getByTestId('library-course-card').filter({ hasText: courseTitle }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });
}

test.describe('B6 Course page selectors and gates', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingNoDemo(page);
    await dismissBlockingShellOverlays(page);
  });

  test('canonical stats strip, tab persistence, delete confirm, reprocess wizard', async ({ page }) => {
    test.setTimeout(180_000);

    const courseTitle = await uploadCourse(page);

    await expect(page.getByTestId('course-stat-mastery-card')).toBeVisible();
    await expect(page.getByTestId('course-stat-progress')).toBeVisible();

    await page.getByTestId('course-tab-sources').click();
    await expect(page.getByTestId('course-panel-sources')).toBeVisible();

    await page.getByTestId('course-back').click();
    await openCourseByTitle(page, courseTitle);
    await expect(page.getByTestId('course-panel-sources')).toBeVisible();

    await page.getByTestId('course-delete').click();
    await expect(page.getByTestId('course-delete-confirm')).toBeVisible();
    await page.getByTestId('course-delete-confirm-cancel').click();
    await expect(page.getByTestId('course-delete-confirm')).toHaveCount(0);

    const reprocess = page.getByTestId('course-reprocess-sources').or(page.getByTestId('course-quality-reprocess'));
    if (await reprocess.first().isVisible()) {
      await reprocess.first().click();
      await expect(page.getByTestId('reprocess-preview-modal')).toBeVisible({ timeout: 10_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('reprocess-preview-modal')).toHaveCount(0);
    }
  });
});
