import { test, expect } from '@playwright/test';
import { dismissBlockingShellOverlays, skipOnboardingToLibrary } from './helpers/onboarding';
import { openWorkspaceFromLibrary } from './helpers/a11y';

test.describe('Sprint I — knowledge graph v2 + Agent relation explain', () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ viewport: { width: 1280, height: 720 } });

  test('course map tab shows persisted knowledge graph meta', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await page.getByTestId('library-course-card').first().click();
    await page.getByRole('button', { name: /Concept Map/i }).click();
    await expect(page.getByTestId('course-knowledge-graph-meta')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('course-knowledge-graph-meta')).toContainText(/6|concepts|έννοιες/i);
  });

  test('concept lens explain-relation opens Agent with graph context', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
    await openWorkspaceFromLibrary(page);
    await page.getByTestId('concept-lens-expand').click({ timeout: 15_000 }).catch(async () => {
      await page.getByTestId('concept-lens-expand-minimal').click();
    });
    await expect(page.getByTestId('concept-lens-detail')).toBeVisible({ timeout: 15_000 });
    const explainBtn = page.getByTestId('concept-ref-explain-price-elasti');
    await expect(explainBtn).toBeVisible({ timeout: 15_000 });
    await explainBtn.click();
    await expect(page.getByTestId('agent-context-banner')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('agent-context-json-toggle').click();
    const json = await page.getByTestId('agent-context-json').textContent();
    expect(json).toMatch(/graphRelation/i);
  });
});
