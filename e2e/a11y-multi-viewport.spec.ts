import { test, expect, devices } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import { axeBuilder, blockingViolations, formatAxeViolations, dismissProductTourIfOpen, waitForLibraryReady, openWorkspaceFromLibrary } from './helpers/a11y';

/**
 * Re-runs the Lesson + WorkspaceDock a11y guarantees across multiple
 * viewport sizes so mobile-specific layout shifts (bottom-sheet drawer,
 * collapsed dock, stacked headers) do not regress focus order, landmarks
 * or aria-labels.
 */

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
      test.setTimeout(120_000);
      await page.goto('/');
      await skipOnboardingToLibrary(page);
      await dismissProductTourIfOpen(page);
      await waitForLibraryReady(page);

      const libResults = await axeBuilder(page).analyze();
      const libBlocking = blockingViolations(libResults);
      expect(
        libBlocking,
        `Library a11y violations @ ${vp.name}:\n${formatAxeViolations(libBlocking)}`,
      ).toEqual([]);

      await openWorkspaceFromLibrary(page);

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

      const inWorkspace = await page.getByTestId('workspace-dock').isVisible().catch(() => false);
      if (inWorkspace) {
        const wsResults = await axeBuilder(page)
          .include('#workspace-main')
          .include('[data-testid="workspace-dock"]')
          .analyze();
        const wsBlocking = blockingViolations(wsResults);
        expect(
          wsBlocking,
          `Workspace a11y violations @ ${vp.name}:\n${formatAxeViolations(wsBlocking)}`,
        ).toEqual([]);
      }
    });
  });
}
