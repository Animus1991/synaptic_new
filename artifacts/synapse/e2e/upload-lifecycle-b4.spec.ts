import { test, expect, type Page } from '@playwright/test';
import { clearAppStorage, skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

const PASTE_NOTES = `
# Microeconomics — Supply and Demand

Supply is the quantity of a good that producers are willing and able to sell at each price level.
Demand is the quantity that consumers are willing and able to buy at each price level.
Market equilibrium occurs where the supply curve intersects the demand curve.
Elasticity measures how responsive quantity is to price changes.
`.trim();

async function openUploadModal(page: Page) {
  await page.keyboard.press('Control+k');
  await expect(page.getByTestId('command-palette')).toBeVisible();
  await page.getByTestId('command-palette-input').fill('upload');
  await page.getByTestId('command-quick-upload').click({ force: true });
  await expect(page.getByTestId('upload-modal')).toBeVisible({ timeout: 10_000 });
}

async function pasteAndReachOutline(page: Page) {
  await page.getByTestId('upload-paste').fill(PASTE_NOTES);
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
}

async function countUserCourses(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('synapse:library-v1');
    if (!raw) return 0;
    try {
      const lib = JSON.parse(raw) as { generatedCourses?: unknown[] };
      return lib.generatedCourses?.length ?? 0;
    } catch {
      return 0;
    }
  });
}

async function lastUserCourseTopicCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('synapse:library-v1');
    if (!raw) return 0;
    try {
      const lib = JSON.parse(raw) as { generatedCourses?: { topics?: unknown[] }[] };
      const userCourse = lib.generatedCourses?.[lib.generatedCourses.length - 1];
      return userCourse?.topics?.length ?? 0;
    } catch {
      return 0;
    }
  });
}

test.describe('B4 Upload lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
  });

  test('blocks continue with empty input and shows validation', async ({ page }) => {
    await openUploadModal(page);
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-validation-errors')).toBeVisible();
  });

  test('dashboard hero carousel opens upload via popup', async ({ page }) => {
    test.setTimeout(60_000);
    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);
    const hub = page.getByTestId('dashboard-action-hub');
    await expect(hub).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('dashboard-hero-action-upload').click({ force: true });
    await page.waitForTimeout(350);
    await expect(page.getByTestId('dashboard-hub-popup-upload')).toBeVisible({ timeout: 10_000 });
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('hub-popup-open-upload').click({ force: true });
    await expect(page.getByTestId('upload-modal')).toBeVisible({ timeout: 10_000 });
  });

  test('shows indeterminate processing status (no fake step list)', async ({ page }) => {
    test.setTimeout(90_000);
    await openUploadModal(page);
    await pasteAndReachOutline(page);
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('upload-processing-status')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Reading document structure')).toHaveCount(0);
  });

  test('escape during processing opens close confirmation', async ({ page }) => {
    test.setTimeout(90_000);
    await openUploadModal(page);
    await pasteAndReachOutline(page);
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('upload-processing-status')).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('upload-close-confirm')).toBeVisible();
    await page.getByTestId('upload-close-confirm').getByRole('button', { name: /cancel|ακύρωση/i }).click();
    await expect(page.getByTestId('upload-close-confirm')).toBeHidden();
    await expect(page.getByTestId('upload-modal')).toBeVisible();
  });

  test('commit failure rolls back library course count', async ({ page }) => {
    test.setTimeout(90_000);
    const before = await countUserCourses(page);
    await openUploadModal(page);
    await pasteAndReachOutline(page);
    await page.evaluate(() => localStorage.setItem('synapse:upload-force-fail', '1'));
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('upload-error')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/test hook/i)).toBeVisible();
    const after = await countUserCourses(page);
    expect(after).toBe(before);
    await page.evaluate(() => localStorage.removeItem('synapse:upload-force-fail'));
  });
});

test.describe.serial('B4 Upload extend rollback', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
  });

  test('failed extend does not change topic count on existing course', async ({ page }) => {
    test.setTimeout(180_000);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();
    await pasteAndReachOutline(page);
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('upload-modal')).toBeHidden({ timeout: 120_000 });

    const topicCountBefore = await lastUserCourseTopicCount(page);
    expect(topicCountBefore).toBeGreaterThan(0);

    await page.getByTestId('library-upload').click();
    await pasteAndReachOutline(page);
    await page.getByRole('button', { name: /Extend an existing course/i }).click();
    await page.getByTestId('upload-modal').getByRole('combobox').selectOption({ index: 1 });
    await page.evaluate(() => localStorage.setItem('synapse:upload-force-fail', '1'));
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('upload-error')).toBeVisible({ timeout: 60_000 });

    const topicCountAfter = await lastUserCourseTopicCount(page);
    expect(topicCountAfter).toBe(topicCountBefore);
    await page.evaluate(() => localStorage.removeItem('synapse:upload-force-fail'));
  });
});
