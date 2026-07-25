import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';

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
    test.setTimeout(120_000);
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();

    const yt = page.getByTestId('upload-youtube-url');
    if (!(await yt.isVisible().catch(() => false))) {
      const more = page.getByTestId('upload-more-sources-toggle');
      if (await more.isVisible().catch(() => false)) await more.click();
    }
    await expect(yt).toBeVisible({ timeout: 8_000 });
    await yt.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('upload-generate').click();

    await expect(page.getByTestId('upload-modal')).toBeHidden({ timeout: 120_000 });
    await expect(page.getByTestId('post-upload-banner')).toBeVisible({ timeout: 30_000 });
    await dismissBlockingShellOverlays(page);

    const browse = page.getByTestId('post-upload-view-course');
    if (await browse.isVisible().catch(() => false)) {
      await browse.click();
    } else {
      await page.getByTestId('nav-library').click();
      await page.getByTestId('library-course-card').first().click();
    }

    await expect(page.getByTestId('course-open-workspace')).toBeVisible({ timeout: 20_000 });
    const title = page.getByTestId('course-title');
    await expect(title).not.toHaveText('');
    await expect(title).toContainText(/supply|demand|elastic/i);
  });
});
