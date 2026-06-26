import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const MOCK_TRANSCRIPT = `
# Supply and Demand

Supply is the quantity producers offer at each price. Demand is quantity buyers want at each price level.

When supply increases while demand stays constant, equilibrium price tends to fall and quantity rises.

# Elasticity

Price elasticity of demand measures the percentage change in quantity demanded divided by the percentage change in price.
Elastic demand means consumers are highly responsive to price changes.
`.trim();

test.describe('YouTube upload flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/v1/youtube/transcript**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ videoId: 'dQw4w9WgXcQ', transcript: MOCK_TRANSCRIPT }),
      });
    });
  });

  test('creates a course from a YouTube URL transcript', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();

    await page.getByTestId('upload-youtube-url').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByTestId('upload-continue').click();
    await page.getByTestId('upload-generate').click();

    await expect(page.getByRole('heading', { name: 'AI is analyzing your material' })).toBeVisible();
    await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });

    const title = page.getByTestId('course-title');
    await expect(title).not.toHaveText('');
    await expect(title).toContainText(/supply|demand|elastic/i);
  });
});
