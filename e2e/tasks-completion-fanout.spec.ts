import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

test.describe('Tasks completion fan-out', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await page.evaluate(() => {
      localStorage.setItem('synapse:product-tour-complete-v1', 'true');
    });
    await dismissBlockingShellOverlays(page);
  });

  test('completing a spaced review task updates dashboard XP and reviews due', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);
    await expect(page.getByTestId('dashboard-page-stats')).toBeVisible({ timeout: 10_000 });

    const reviewsDue = page.getByTestId('dashboard-stat-reviews-due');
    const todayXp = page.getByTestId('dashboard-stat-today-xp');
    await expect(reviewsDue).toBeVisible();
    await expect(todayXp).toBeVisible();

    const reviewsBefore = Number((await reviewsDue.textContent())?.replace(/\D/g, '') ?? '0');
    const xpBefore = Number((await todayXp.textContent())?.replace(/\D/g, '') ?? '0');

    await page.getByTestId('nav-tasks').click();
    await dismissBlockingShellOverlays(page);

    const completeBtn = page.getByTestId('task-complete-task1');
    await expect(completeBtn).toBeVisible({ timeout: 10_000 });
    await completeBtn.click();

    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);
    await expect(page.getByTestId('dashboard-page-stats')).toBeVisible();

    await expect
      .poll(async () => Number((await todayXp.textContent())?.replace(/\D/g, '') ?? '0'))
      .toBe(xpBefore + 30);
    await expect
      .poll(async () => Number((await reviewsDue.textContent())?.replace(/\D/g, '') ?? '0'))
      .toBe(Math.max(0, reviewsBefore - 1));
  });
});
