import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('Mobile workspace tool drawer (Sprint D)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.describe.configure({ timeout: 120_000 });

  test('opens drawer and switches tools on narrow viewport', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    const mobileLibrary = page.getByTestId('nav-mobile-library');
    if (await mobileLibrary.isVisible().catch(() => false)) {
      await mobileLibrary.click();
    } else {
      await page.getByTestId('nav-library').click();
    }
    await page.getByTestId('library-course-card').first().click();
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });

    const openTools = page.getByTestId('workspace-mobile-tools-open');
    await expect(openTools).toBeVisible({ timeout: 15_000 });
    await openTools.click();

    const drawer = page.getByTestId('workspace-mobile-tool-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId('workspace-mobile-tool-list')).toBeVisible();

    await page.getByTestId('mobile-tool-scratchpad').click();
    await expect(drawer).not.toBeVisible();
    await expect(page.getByTestId('study-workspace')).toBeVisible();
  });
});
