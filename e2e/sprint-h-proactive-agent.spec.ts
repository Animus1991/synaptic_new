import { test, expect } from '@playwright/test';
import { dismissBlockingShellOverlays, skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('Sprint H — proactive agent alerts and adaptive gap routing', () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ viewport: { width: 1280, height: 720 } });

  test('dashboard shows proactive agent alerts with demo FSRS data', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('proactive-agent-alert-strip')).toBeVisible({ timeout: 15_000 });
  });

  test('proactive alert opens workspace leitner for forgetting risk', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);
    const alert = page.locator('[data-testid^="proactive-agent-alert-forget-"]').first();
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await alert.click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-testid="workspace-tool-frame"][data-tool="leitner"]')).toBeVisible({
      timeout: 15_000,
    });
  });
});
