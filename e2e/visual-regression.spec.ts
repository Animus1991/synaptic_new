import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('Visual regression — Warm Sand platform (F7)', () => {
  test('library empty state snapshot', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('platform-empty-state').or(page.getByTestId('library-course-card').first())).toBeVisible();
    await expect(page).toHaveScreenshot('library-warm-sand.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.04,
    });
  });

  test('dashboard warm sand snapshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /demo|δοκίμασε/i }).click();
    await page.getByRole('link', { name: /dashboard|πίνακας/i }).click();
    await expect(page.getByRole('heading', { name: /Good|Καλη/i })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('dashboard-warm-sand.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.04,
    });
  });
});
