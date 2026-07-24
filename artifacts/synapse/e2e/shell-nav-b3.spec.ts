import { test, expect } from '@playwright/test';
import { clearAppStorage, completeOnboardingScheduleWithUpload, dismissBlockingShellOverlays, skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('B3 Shell — role/capability navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await completeOnboardingScheduleWithUpload(page);
    await dismissBlockingShellOverlays(page);
  });

  test('hides teacher and student-org for self-learner profile', async ({ page }) => {
    await expect(page.getByTestId('nav-teacher')).toHaveCount(0);
    await expect(page.getByTestId('nav-student-org')).toHaveCount(0);
  });

  test('blocks teacher deep link for unauthorized user', async ({ page }) => {
    await page.goto('/?view=teacher');
    await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('nav-teacher')).toHaveCount(0);
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
  });

  test('mobile More opens overflow navigation drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('nav-mobile-more')).toBeVisible();
    await page.getByTestId('nav-mobile-more').click();
    const drawer = page.getByTestId('nav-mobile-drawer');
    await expect(drawer.getByTestId('nav-analytics')).toBeVisible();
    await expect(drawer.getByTestId('nav-settings')).toBeVisible();
  });

  test('Escape closes mobile navigation drawer and restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const more = page.getByTestId('nav-mobile-more');
    await more.click();
    await expect(page.getByTestId('nav-mobile-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('nav-mobile-drawer')).toHaveCount(0);
    await expect(more).toBeFocused();
  });
});

test.describe('B3 Shell — notifications and quick actions', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await page.waitForFunction(() => localStorage.getItem('synapse:session-v2') !== null);
    await page.evaluate(() => {
      const raw = localStorage.getItem('synapse:session-v2');
      if (!raw) return;
      const data = JSON.parse(raw) as {
        userSettings?: Record<string, unknown>;
        activities?: Array<{ id: string; type: string; description: string; timestamp: string; xp?: number }>;
      };
      data.userSettings = {
        ...(data.userSettings ?? {}),
        notificationsLastSeenAt: '2020-01-01T00:00:00.000Z',
      };
      data.activities = [{
        id: 'e2e-unread-1',
        type: 'task_complete',
        description: 'E2E unread notification',
        timestamp: new Date().toISOString(),
        xp: 10,
      }, ...(data.activities ?? [])];
      localStorage.setItem('synapse:session-v2', JSON.stringify(data));
    });
    await page.reload();
    await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
    await dismissBlockingShellOverlays(page);
  });

  test('notification badge reflects unread count and clears on open', async ({ page }) => {
    await dismissBlockingShellOverlays(page);
    const bell = page.getByTestId('shell-notifications-bell');
    await expect(bell).toHaveAttribute('data-unread-count', '1');
    await bell.click({ force: true });
    await expect(page.getByTestId('notifications-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bell).toHaveAttribute('data-unread-count', '0');
  });

  test('command palette exposes shared quick upload action', async ({ page }) => {
    await dismissBlockingShellOverlays(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.getByTestId('command-palette-input').fill('upload');
    const quickUpload = page.getByTestId('command-quick-upload');
    await expect(quickUpload).toBeVisible();
    await quickUpload.click({ force: true });
    await expect(page.getByTestId('upload-modal')).toBeVisible({ timeout: 10_000 });
  });
});
