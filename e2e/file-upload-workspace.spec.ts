import { test, expect } from '@playwright/test';

const NOTES = `
# Microeconomics — Supply and Demand

Supply is the quantity of a good that producers are willing and able to sell at each price level.
Demand is the quantity that consumers are willing and able to buy at each price level.
Market equilibrium occurs where the supply curve intersects the demand curve.

# Price Elasticity

Price elasticity of demand measures how responsive quantity demanded is to a change in price.
When demand is inelastic, consumers buy similar quantities even when prices rise sharply.
When demand is elastic, small price changes cause large shifts in quantity demanded.
`.trim();

async function skipOnboarding(page: import('@playwright/test').Page) {
  await page.getByTestId('landing-get-started').click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Self-Learner' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Deeply understand material' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Skip — explore the demo first' }).click();
}

test.describe('Paste upload → course review → Study Workspace', () => {
  test('shows course diagnostics before opening the workspace', async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();

    await page.getByTestId('upload-paste').fill(NOTES);
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/supply|demand|elasticity/i).first()).toBeVisible();
    await page.getByTestId('upload-generate').click();

    await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('app-toast')).toContainText(/sections detected|ενότητες ανιχνεύθηκαν/i);
    await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('course-title')).not.toHaveText('');

    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/from your notes|από τις σημειώσεις σου/i).first()).toBeVisible();
    await expect(page.getByText(/supply|demand|elasticity/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
