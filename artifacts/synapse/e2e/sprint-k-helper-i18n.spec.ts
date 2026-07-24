import { test, expect, type Page } from '@playwright/test';
import { dismissBlockingShellOverlays, skipOnboardingToLibrary } from './helpers/onboarding';
import { openWorkspaceFromLibrary, waitForLibraryReady } from './helpers/a11y';
import { openReaderInWorkspace, openToolInWorkspace } from './helpers/workspace';

async function switchToGreekFromLibrary(page: Page) {
  await page.getByTestId('nav-settings').click();
  await page.getByRole('button', { name: 'Ελληνικά', exact: true }).click();
  await page.getByTestId('nav-library').click();
  await waitForLibraryReady(page);
}

test.describe('Sprint K — lib helper i18n', () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ viewport: { width: 1280, height: 720 } });

  test('Leitner type filter shows Greek labels when UI language is el', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await switchToGreekFromLibrary(page);
    await openWorkspaceFromLibrary(page);
    await openToolInWorkspace(page, 'leitner');
    await expect(page.getByTestId('leitner-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('leitner-type-filter')).toBeVisible();
    await expect(page.getByText('Όλοι οι τύποι')).toBeVisible();
    const typeChip = page
      .locator('[data-testid="leitner-type-term"], [data-testid="leitner-type-mistake"], [data-testid="leitner-type-definition"]')
      .first();
    if (await typeChip.isVisible()) {
      await expect(typeChip).toHaveText(/Όρος|Ορισμός|Λάθος|Τύπος|Κενό|Απόκρυψη/);
    }
  });

  test('reader selection actions show Greek labels when UI language is el', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await switchToGreekFromLibrary(page);
    await openWorkspaceFromLibrary(page);
    await openReaderInWorkspace(page);

    const body = page.getByTestId('reader-structured-body');
    await body.evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let target: Text | null = null;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (/demand|ζήτηση/i.test(node.textContent ?? '')) {
          target = node;
          break;
        }
      }
      if (!target) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    await expect(page.getByTestId('reader-selection-actions')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('selection-action-ask-agent')).toHaveText('Ρώτα Agent');
    await expect(page.getByTestId('selection-action-annotate')).toHaveText('Επισήμανση');
  });
});
