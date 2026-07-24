import { test, expect } from '@playwright/test';
import { clearAppStorage, skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

const NOTES = `
# Microeconomics — Supply and Demand

Supply is the quantity of a good that producers are willing and able to sell at each price level.
Demand is the quantity that consumers are willing and able to buy at each price level.
Market equilibrium occurs where the supply curve intersects the demand curve.
Elasticity measures how responsive quantity is to price changes.
`.trim();

test.describe('B5 Note Analysis diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);
  });

  test('shows truthful summary without fabricated QA defaults', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();
    await page.getByTestId('upload-paste').fill(NOTES);
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('upload-modal')).toBeHidden({ timeout: 120_000 });

    await dismissBlockingShellOverlays(page);
    await page.keyboard.press('Control+k');
    await page.getByTestId('command-palette-input').fill('note analysis');
    await page.getByTestId('command-quick-note-analysis').click();

    await expect(page.getByTestId('note-analysis-summary')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('note-analysis-readiness')).toBeVisible();
    await expect(page.getByText('Pedagogical Quality')).toHaveCount(0);
    await expect(page.getByTestId('note-analysis-next-action')).toBeVisible();

    await page.getByTestId('note-analysis-explore-details').click();
    await page.getByTestId('note-analysis-stage-5').click();
    const qaEmpty = page.getByTestId('note-analysis-qa-empty');
    const qaMetric = page.getByTestId('note-analysis-qa-source-coverage');
    await expect(qaEmpty.or(qaMetric)).toBeVisible({ timeout: 5_000 });
  });
});
