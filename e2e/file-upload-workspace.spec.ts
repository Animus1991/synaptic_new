import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import { uploadAndOpenCourseView } from './helpers/libraryLifecycle';

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

test.describe('Paste upload → course review → Study Workspace', () => {
  test('shows course ready path before opening the workspace', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await uploadAndOpenCourseView(page, NOTES);
    await expect(page.getByTestId('course-open-workspace')).toBeVisible();

    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/from your notes|από τις σημειώσεις σου|supply|demand|elasticity/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
