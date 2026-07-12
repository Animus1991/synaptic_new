import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

test.describe('B4 Upload lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
  });

  test('blocks continue with empty input and shows validation', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.getByTestId('command-palette-input').fill('upload');
    await page.getByTestId('command-quick-upload').click({ force: true });
    await expect(page.getByTestId('upload-modal')).toBeVisible({ timeout: 10_000 });
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
});
