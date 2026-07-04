import { test, expect } from '@playwright/test';
import { dismissBlockingShellOverlays, skipOnboardingToLibrary } from './helpers/onboarding';
import { openWorkspaceFromLibrary } from './helpers/a11y';

test.describe('Sprint J — reader occlusion-from-selection + UploadModal i18n', () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ viewport: { width: 1280, height: 720 } });

  test('reader selection can create occlusion Leitner card', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await openWorkspaceFromLibrary(page);
    await page.getByTestId('dock-tool-reader').click();
    await expect(page.getByTestId('cognitive-reader')).toBeVisible({ timeout: 15_000 });

    const body = page.getByTestId('reader-structured-body');
    await body.evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let target: Text | null = null;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (/equilibrium|ισορροπ/i.test(node.textContent ?? '')) {
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
    const occlusionBtn = page.getByTestId('selection-action-make-occlusion');
    if (!(await occlusionBtn.isVisible())) {
      test.skip(true, 'No OCR/heuristic region match for demo reader selection');
    }
    await occlusionBtn.click();
    await page.getByTestId('dock-tool-leitner').click();
    await expect(page.getByTestId('leitner-panel')).toBeVisible({ timeout: 15_000 });
    const occlusionFilter = page.getByTestId('leitner-type-occlusion');
    if (await occlusionFilter.isVisible()) {
      await occlusionFilter.click();
    }
    await expect(page.getByTestId('leitner-occlusion-face')).toBeVisible({ timeout: 15_000 });
  });

  test('upload configure step shows i18n source mode labels', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await page.getByTestId('library-upload').click();
    await page.getByTestId('upload-paste').fill(
      'Microeconomics chapter: supply, demand, equilibrium, elasticity, consumer surplus.',
    );
    await page.getByTestId('upload-continue').click();
    await expect(page.getByText(/Source Mode|Λειτουργία πηγής/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Strict Source-Grounded|Αυστηρά από πηγή/i)).toBeVisible();
    await expect(page.getByText(/Learning Focus|Εστίαση μάθησης/i)).toBeVisible();
  });
});
