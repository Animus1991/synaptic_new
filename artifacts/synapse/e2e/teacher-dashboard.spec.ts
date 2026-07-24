import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

test.describe('Teacher dashboard smoke (Sprint D)', () => {
  test('renders offline shell with sign-in prompt', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);

    await page.getByTestId('nav-teacher').click();
    await expect(page.getByTestId('teacher-dashboard')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/sign in required for the teacher dashboard/i)).toBeVisible();
    await expect(page.getByTestId('teacher-open-settings')).toBeVisible();
    await expect(page.getByTestId('teacher-class-rosters')).not.toBeVisible();
  });
});
