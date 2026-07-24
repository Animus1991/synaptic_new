import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingNoDemo, dismissBlockingShellOverlays } from './helpers/onboarding';
import { uploadCourseFromPaste } from './helpers/libraryLifecycle';

const NOTES_A = `
# Cognitive Psychology

Working memory limits shape how learners process new information.
Retrieval practice strengthens long-term retention more than re-reading.
`.trim();

const NOTES_B = `
# Behavioral Economics

Present bias affects intertemporal choice under uncertainty.
Loss aversion shifts risk preferences in predictable ways.
`.trim();

test.describe('C1 Library lifecycle — upload, delete fan-out', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingNoDemo(page);
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('nav-library').click();
  });

  test('upload course, delete from library with confirm, verify removed', async ({ page }) => {
    test.setTimeout(180_000);

    const courseTitle = await uploadCourseFromPaste(page, NOTES_A);
    await page.getByRole('button', { name: /browse modules|περιήγηση/i }).click();
    await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('course-back').click();

    const card = page.getByTestId('library-course-card').filter({ hasText: courseTitle }).first();
    await card.getByTestId('library-course-delete').click();
    await expect(page.getByTestId('library-course-delete-confirm')).toBeVisible();
    await page.getByTestId('library-course-delete-confirm-confirm').click();
    await expect(page.getByTestId('library-course-delete-confirm')).toHaveCount(0);
    await expect(page.getByTestId('library-course-card').filter({ hasText: courseTitle })).toHaveCount(0);
  });

  test('multi-course: delete one course leaves the other in library and dashboard', async ({ page }) => {
    test.setTimeout(300_000);

    const titleA = await uploadCourseFromPaste(page, NOTES_A);
    await page.getByRole('button', { name: /dismiss|κλείσιμο/i }).click().catch(() => {});
    const titleB = await uploadCourseFromPaste(page, NOTES_B);

    await expect(page.getByTestId('library-course-card').filter({ hasText: titleA })).toHaveCount(1);
    await expect(page.getByTestId('library-course-card').filter({ hasText: titleB })).toHaveCount(1);

    const cardA = page.getByTestId('library-course-card').filter({ hasText: titleA }).first();
    await cardA.getByTestId('library-course-delete').click();
    await page.getByTestId('library-course-delete-confirm-confirm').click();

    await expect(page.getByTestId('library-course-card').filter({ hasText: titleA })).toHaveCount(0);
    await expect(page.getByTestId('library-course-card').filter({ hasText: titleB })).toHaveCount(1);

    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('platform-main')).toBeVisible();
    await page.getByTestId('nav-library').click();
    await expect(page.getByTestId('library-course-card').filter({ hasText: titleB })).toHaveCount(1);
  });

  test('file delete from course sources tab with confirm', async ({ page }) => {
    test.setTimeout(180_000);

    await uploadCourseFromPaste(page, NOTES_A);
    await page.getByRole('button', { name: /browse modules|περιήγηση/i }).click();
    await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('course-tab-sources').click();
    await expect(page.getByTestId('course-panel-sources')).toBeVisible();

    const removeBtn = page.locator(`[data-testid^="remove-source-"]`).first();
    await expect(removeBtn).toBeVisible({ timeout: 15_000 });
    const fileId = (await removeBtn.getAttribute('data-testid'))!.replace('remove-source-', '');

    await removeBtn.click();
    await expect(page.getByTestId('course-file-delete-confirm')).toBeVisible();
    await page.getByTestId('course-file-delete-confirm-confirm').click();
    await expect(page.getByTestId(`remove-source-${fileId}`)).toHaveCount(0);
  });

  test('reprocess wizard opens and closes from course page', async ({ page }) => {
    test.setTimeout(180_000);

    await uploadCourseFromPaste(page, NOTES_A);
    await page.getByRole('button', { name: /browse modules|περιήγηση/i }).click();
    await expect(page.getByTestId('course-page-stats')).toBeVisible({ timeout: 30_000 });

    const reprocess = page.getByTestId('course-reprocess-sources').or(page.getByTestId('course-quality-reprocess'));
    if (await reprocess.first().isVisible()) {
      await reprocess.first().click();
      await expect(page.getByTestId('reprocess-preview-modal')).toBeVisible({ timeout: 10_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('reprocess-preview-modal')).toHaveCount(0);
    }
  });
});
