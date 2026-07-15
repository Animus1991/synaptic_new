import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

test.describe('Dashboard D1 canonical selectors', () => {
  test('active demo shows canonical stat strip testids', async ({ page }) => {
    test.setTimeout(60_000);
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await page.evaluate(() => {
      localStorage.setItem('synapse:product-tour-complete-v1', 'true');
    });
    await dismissBlockingShellOverlays(page);

    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);

    await expect(page.getByTestId('dashboard-hero-panel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('dashboard-action-hub')).toBeVisible();
    await expect(page.getByTestId('dashboard-page-stats')).toBeVisible();
    await expect(page.getByTestId('dashboard-stat-reviews-due')).toBeVisible();
    await expect(page.getByTestId('dashboard-stat-today-xp')).toBeVisible();
  });

  test('empty dashboard shows upload CTA without stat strip', async ({ page }) => {
    test.setTimeout(60_000);
    await clearAppStorage(page);
    await page.goto('/');
    await page.getByTestId('landing-get-started').click();
    await page.getByTestId('onboarding-continue').click();
    await page.getByTestId('onboarding-role-selflearner').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-goal-understand').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-continue-without-upload').click();
    await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => {
      localStorage.setItem('synapse:product-tour-complete-v1', 'true');
    });
    await dismissBlockingShellOverlays(page);

    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);

    await expect(page.getByText(/welcome|καλώς/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('dashboard-page-stats')).toHaveCount(0);
  });
});
