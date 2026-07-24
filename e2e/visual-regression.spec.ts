import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import { forcePrimerTheme } from './helpers/primerCapture';

test.describe('Visual regression — Minimal platform (F7)', () => {
  test('library snapshot', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await forcePrimerTheme(page, 'minimal');
    await page.getByTestId('nav-library').click();
    await expect(page.getByRole('heading', { name: /Your materials|Το υλικό σου/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('platform-empty-state').or(page.getByTestId('library-course-card').first())).toBeVisible();
    await expect(page).toHaveScreenshot('library-minimal.png', {
      fullPage: false,
      // Slightly looser than default — Chromium font AA differs win/linux CI.
      maxDiffPixelRatio: 0.08,
    });
  });

  test('dashboard snapshot', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await forcePrimerTheme(page, 'minimal');
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByRole('heading', { name: /Good|Καλη/i })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('dashboard-minimal.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.08,
    });
  });
});
