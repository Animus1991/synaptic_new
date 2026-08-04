import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import {
  axeBuilder,
  blockingViolations,
  formatAxeViolations,
  persistAppTheme,
  dismissProductTourIfOpen,
  waitForLibraryReady,
  type AppTheme,
} from './helpers/a11y';

const THEMES: AppTheme[] = ['dark', 'light', 'spectrum', 'minimal', 'minimal-dark'];

for (const theme of THEMES) {
  test.describe(`A11y contrast — ${theme} theme`, () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test('library passes axe WCAG AA including color-contrast', async ({ page }) => {
      test.setTimeout(90_000);
      await persistAppTheme(page, theme);
      await page.goto('/');
      await skipOnboardingToLibrary(page);
      await dismissProductTourIfOpen(page);
      await waitForLibraryReady(page);
      await expect
        .poll(async () => page.locator('html').getAttribute('data-theme'), { timeout: 10_000 })
        .toBe(theme);

      const results = await axeBuilder(page).analyze();
      const blocking = blockingViolations(results);
      expect(
        blocking,
        `Library a11y @ ${theme}:\n${formatAxeViolations(blocking)}`,
      ).toEqual([]);
    });
  });
}
