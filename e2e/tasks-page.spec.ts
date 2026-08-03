import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

test.describe('Tasks page coverage', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await page.evaluate(() => {
      localStorage.setItem('synapse:product-tour-complete-v1', 'true');
    });
    await dismissBlockingShellOverlays(page);
  });

  test('page loads with create-plan and tabs; mistakes tab is actionable', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByTestId('nav-tasks').click();
    await dismissBlockingShellOverlays(page);

    await expect(page.getByTestId('tasks-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tasks-create-plan')).toBeVisible();
    await expect(page.getByTestId('tasks-tab-today')).toBeVisible();

    await page.getByTestId('tasks-tab-reviews').click();
    await expect(page.getByTestId('tasks-panel-reviews')).toBeVisible();

    await page.getByTestId('tasks-tab-mistakes').click();
    await expect(page.getByTestId('tasks-panel-mistakes')).toBeVisible();

    const createPlan = page.getByTestId('tasks-create-plan');
    const disabled = await createPlan.isDisabled();
    if (!disabled) {
      await createPlan.click();
      // Session start should keep user on tasks or open a task surface
      await expect(page.getByTestId('tasks-page')).toBeVisible();
    }
  });

  test('jump-to-sessions control scrolls to launchers', async ({ page }) => {
    test.setTimeout(45_000);
    await page.getByTestId('nav-tasks').click();
    await dismissBlockingShellOverlays(page);
    await expect(page.getByTestId('tasks-page')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('tasks-tab-filter').click();
    await expect(page.getByTestId('tasks-session-launchers')).toBeInViewport();
  });
});
