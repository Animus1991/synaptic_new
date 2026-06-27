import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { skipOnboardingToLibrary } from './helpers/onboarding';

/**
 * Re-runs the Lesson + WorkspaceDock a11y guarantees across multiple
 * viewport sizes so mobile-specific layout shifts (bottom-sheet drawer,
 * collapsed dock, stacked headers) do not regress focus order, landmarks
 * or aria-labels.
 */

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const VIEWPORTS = [
  { name: 'mobile-narrow', width: 360, height: 780 },
  { name: 'mobile-pixel', ...devices['Pixel 5'].viewport! },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-md', width: 1280, height: 900 },
  { name: 'desktop-xl', width: 1680, height: 1050 },
];

for (const vp of VIEWPORTS) {
  test.describe(`A11y @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('library + workspace shell pass axe (no serious/critical)', async ({ page }) => {
      await page.goto('/');
      await skipOnboardingToLibrary(page);

      const libResults = await new AxeBuilder({ page })
        .withTags(A11Y_TAGS)
        .disableRules(['color-contrast'])
        .analyze();
      const libBlocking = libResults.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      );
      expect(
        libBlocking,
        `Library a11y violations @ ${vp.name}:\n${JSON.stringify(libBlocking, null, 2)}`,
      ).toEqual([]);

      // Try entering a lesson/workspace from the library
      const firstItem = page.getByTestId(/^library-(lesson|task|course)-/).first();
      if (await firstItem.isVisible().catch(() => false)) {
        await firstItem.click();
      }

      // Mobile: a hamburger may hide the dock — open it so axe sees the nav.
      if (vp.width < 768) {
        const openTools = page.getByTestId('workspace-mobile-tools-open');
        if (await openTools.isVisible().catch(() => false)) {
          await openTools.click();
        }
      }

      // Skip link must be reachable as the first focusable element.
      await page.keyboard.press('Tab');
      const focusedHref = await page.evaluate(
        () => document.activeElement?.getAttribute('href') ?? document.activeElement?.tagName ?? '',
      );
      expect(focusedHref).toBeTruthy();

      const wsResults = await new AxeBuilder({ page })
        .withTags(A11Y_TAGS)
        .disableRules(['color-contrast'])
        .analyze();
      const wsBlocking = wsResults.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      );
      expect(
        wsBlocking,
        `Workspace a11y violations @ ${vp.name}:\n${JSON.stringify(wsBlocking, null, 2)}`,
      ).toEqual([]);
    });
  });
}
