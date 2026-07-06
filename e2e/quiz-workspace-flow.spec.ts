import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import { completeQuizSession } from './helpers/quizSession';
import { openToolInWorkspace } from './helpers/workspace';

const NOTES = `
# Microeconomics — Supply and Demand

Supply is the quantity of a good that producers are willing and able to sell at each price level.
Demand is the quantity that consumers are willing and able to buy at each price level.
Market equilibrium occurs where the supply curve intersects the demand curve.

# Price Elasticity

Price elasticity of demand measures how responsive quantity demanded is to a change in price.
When demand is inelastic, consumers buy similar quantities even when prices rise sharply.
When demand is elastic, small price changes cause large shifts in quantity demanded.

| Type | Quantity response | Price sensitivity |
| ---- | ----------------- | ----------------- |
| Elastic demand | Large shift | High |
| Inelastic demand | Small shift | Low |
`.trim();

test.describe('Quiz workspace flow (Phase D)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('upload → workspace → quiz tool → answer session → score summary', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('library-upload').click();
    await page.getByTestId('upload-paste').fill(NOTES);
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });

    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-testid="study-workspace"][data-grounded="true"]')).toBeVisible({
      timeout: 60_000,
    });

    await openToolInWorkspace(page, 'quiz');
    await expect(page.getByTestId('quiz-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('quiz-panel-empty')).toHaveCount(0);
    await expect(page.getByTestId('quiz-session')).toBeVisible({ timeout: 15_000 });

    await completeQuizSession(page);

    await expect(page.getByTestId('quiz-session-summary-detail')).toBeVisible();
    await expect(page.getByTestId('quiz-session-summary-detail')).not.toHaveText('');
  });
});
