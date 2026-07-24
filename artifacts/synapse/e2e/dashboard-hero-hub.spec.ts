import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

test.describe('Dashboard hero hub', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await page.evaluate(() => {
      localStorage.setItem('synapse:product-tour-complete-v1', 'true');
    });
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('nav-dashboard').click();
    await dismissBlockingShellOverlays(page);
    await expect(page.getByTestId('dashboard-action-hub')).toBeVisible({ timeout: 10_000 });
  });

  test('double-click calendar card scrolls to full exam calendar', async ({ page }) => {
    test.setTimeout(60_000);
    const calendarCard = page.getByTestId('dashboard-hero-action-calendar');
    await calendarCard.scrollIntoViewIfNeeded();
    await calendarCard.dblclick({ force: true });
    const panel = page.locator('#exam-calendar-panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => panel.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight * 0.55;
      }))
      .toBe(true);
  });

  test('persists exam date and personal milestone after reload', async ({ page }) => {
    test.setTimeout(60_000);
    const calendarCard = page.getByTestId('dashboard-hero-action-calendar');
    await calendarCard.scrollIntoViewIfNeeded();
    await dismissBlockingShellOverlays(page);
    await calendarCard.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('dashboard-hub-popup-calendar')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('hub-exam-date-input').fill('2026-12-15');
    await page.getByPlaceholder(/mock exam|δοκιμαστική/i).fill('Mock exam');
    await page.locator('input[type="date"]').nth(1).fill('2026-11-01');
    await page.getByRole('button', { name: /add|προσθήκη/i }).click();

    await expect(page.getByTestId('dashboard-hub-popup-calendar').getByText('Mock exam').first()).toBeVisible();

    await page.reload();
    await dismissBlockingShellOverlays(page);
    await expect(page.getByTestId('dashboard-action-hub')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('dashboard-hero-action-calendar').click({ force: true });
    await page.waitForTimeout(350);
    await expect(page.getByTestId('hub-exam-date-input')).toHaveValue('2026-12-15');
    await expect(page.getByTestId('dashboard-hub-popup-calendar').getByText('Mock exam').first()).toBeVisible();
    await expect(page.getByTestId('dashboard-hub-popup-calendar').getByText('2026-11-01').first()).toBeVisible();
  });
});
