import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('Visual regression — Warm Sand platform (F7)', () => {
  test('library empty state snapshot', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await page.getByTestId('nav-library').click();
    await expect(page.getByRole('heading', { name: /Your materials|Το υλικό σου/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('platform-empty-state').or(page.getByTestId('library-course-card').first())).toBeVisible();
    await expect(page).toHaveScreenshot('library-warm-sand.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.04,
    });
  });

  test('dashboard warm sand snapshot', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByRole('heading', { name: /Good|Καλη/i })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('dashboard-warm-sand.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.04,
    });
  });
});
