import { test, expect } from '@playwright/test';
import {
  axeBuilder,
  blockingViolations,
  enterStudyWorkspace,
  formatAxeViolations,
  setAppTheme,
  type AppTheme,
} from './helpers/a11y';

const THEMES: AppTheme[] = ['dark', 'light', 'spectrum', 'minimal', 'minimal-dark'];

for (const theme of THEMES) {
  test.describe(`A11y workspace contrast — ${theme}`, () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test('study workspace passes axe WCAG AA including color-contrast', async ({ page }) => {
      test.setTimeout(120_000);
      await enterStudyWorkspace(page);
      await setAppTheme(page, theme);
      await page.waitForTimeout(300);

      const results = await axeBuilder(page)
        .include('#workspace-main')
        .include('[data-testid="study-workspace"]')
        .include('[data-testid="workspace-dock"]')
        .analyze();
      const blocking = blockingViolations(results);
      expect(
        blocking,
        `Workspace a11y @ ${theme}:\n${formatAxeViolations(blocking)}`,
      ).toEqual([]);
    });
  });
}
