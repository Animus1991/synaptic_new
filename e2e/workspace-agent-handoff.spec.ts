import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const GREEK_SYLLABUS = `
ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ
Α π ό λ υ τ α π λ ε ο ν ε κ τ ή μ α τ α και διεθνές εμπόριο.
`.trim();

async function openGreekReaderWorkspace(page: import('@playwright/test').Page) {
  await page.goto('/');
  await skipOnboardingToLibrary(page);

  await page.getByTestId('nav-library').click();
  await page.getByTestId('library-upload').click();
  await page.getByTestId('upload-paste').fill(GREEK_SYLLABUS);
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('upload-generate').click();
  await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('course-open-workspace').click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('dock-tool-reader').click();
  await expect(page.getByTestId('cognitive-reader')).toBeVisible({ timeout: 15_000 });
}

test.describe('Workspace selection → Agent handoff (Sprint C)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('Reader selection opens Agent with excerpt in context JSON', async ({ page }) => {
    await openGreekReaderWorkspace(page);

    const repaired = page.getByText(/πλεονεκτήματα|πλεονεκτηματα/i).first();
    await expect(repaired).toBeVisible({ timeout: 15_000 });

    const body = page.getByTestId('reader-structured-body');
    await body.evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let target: Text | null = null;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (/πλεονεκτ/i.test(node.textContent ?? '')) {
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
    await page.getByTestId('selection-action-ask-agent').click();

    await expect(page.getByTestId('agent-context-banner')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('agent-context-json-toggle').click();
    const json = await page.getByTestId('agent-context-json').textContent();
    expect(json).toMatch(/selectionExcerpt/i);
    expect(json).toMatch(/πλεονεκτ/i);
  });
});
