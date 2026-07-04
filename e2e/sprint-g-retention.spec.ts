import { test, expect } from '@playwright/test';
import { dismissBlockingShellOverlays, skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('Sprint G — FSRS forecast and Leitner interleaving', () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ viewport: { width: 1280, height: 720 } });

  test('analytics shows FSRS retention forecast with demo data', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('nav-analytics').click();
    await expect(page.getByTestId('analytics-fsrs-forecast')).toBeVisible({ timeout: 15_000 });
  });

  test('leitner interleave toggle is available in workspace', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);
    const leitnerCta = page.getByTestId('dashboard-smart-cta-reviews-leitner');
    await expect(leitnerCta).toBeVisible({ timeout: 15_000 });
    await leitnerCta.click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-testid="workspace-tool-frame"][data-tool="leitner"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('leitner-panel')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('leitner-interleave-toggle')).toBeVisible({ timeout: 15_000 });
  });
});
