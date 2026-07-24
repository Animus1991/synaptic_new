import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

test.describe('Platform skip links — desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('first Tab focuses skip-to-main on library', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.keyboard.press('Tab');
    const href = await page.evaluate(() => document.activeElement?.getAttribute('href'));
    expect(href).toBe('#platform-main');
  });

  test('skip-to-main moves focus to main landmark', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('platform-skip-main').evaluate((el: HTMLAnchorElement) => el.click());

    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('platform-main');
  });
});

test.describe('Platform skip links — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('skip-to-main targets main content on mobile', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('platform-skip-main').evaluate((el: HTMLAnchorElement) => el.click());
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('platform-main');
  });
});

