import { test, expect } from '@playwright/test';

test.describe('Technotes-inspired features', () => {
  test('landing FAQ is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('landing-faq')).toBeVisible();
    await expect(page.getByTestId('landing-faq-item-0')).toBeVisible();
  });

  test('take a breath nav opens modal when logged in', async ({ page }) => {
    await page.goto('/?demo=1');
    await page.getByTestId('landing-get-started').click();
    await page.waitForURL(/dashboard|onboarding/);
    if (await page.getByTestId('nav-dashboard').isVisible()) {
      await page.getByTestId('header-take-breath').click();
      await expect(page.getByTestId('take-breath-modal')).toBeVisible();
    }
  });
});
