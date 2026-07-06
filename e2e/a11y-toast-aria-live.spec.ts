import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('Notification toast aria-live', () => {
  test('polite region announces success toasts', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.evaluate(() => {
      window.__synapseTest?.notifySuccess('Library synced', '2 pending uploads completed');
    });

    await expect(page.getByTestId('notification-aria-polite')).toContainText('Library synced');
    await expect(page.getByTestId('notification-toast-stack')).toContainText('Library synced');
    await expect(page.getByTestId('notification-toast-stack')).toContainText('2 pending uploads completed');
  });

  test('assertive region announces error toasts', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.evaluate(() => {
      window.__synapseTest?.notifyError('Anki import failed', 'Invalid .apkg format');
    });

    await expect(page.getByTestId('notification-aria-assertive')).toContainText('Anki import failed');
    await expect(page.getByTestId('notification-toast-stack')).toContainText('Invalid .apkg format');
  });
});
