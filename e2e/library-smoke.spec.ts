import { test, expect } from '@playwright/test';

/** OPT-L6 — Library smoke: filter, upload open, topic chip → workspace. */
test.describe('Library smoke (OPT-L6)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.getByTestId('landing-see-demo').click();
    await expect(page.getByTestId('library-page')).toBeVisible({ timeout: 15_000 });
  });

  test('filter pills toggle and upload opens modal', async ({ page }) => {
    const attention = page.getByTestId('library-filter-attention');
    await expect(attention).toBeVisible();
    await attention.click();
    await expect(attention).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('library-filter-all').click();
    await expect(page.getByTestId('library-filter-all')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('library-upload').click();
    await expect(page.getByTestId('upload-modal')).toBeVisible({ timeout: 10_000 });
  });

  test('topic / prereq chip opens study workspace', async ({ page }) => {
    const stacks = page.getByTestId('library-info-stacks');
    await expect(stacks).toBeVisible({ timeout: 15_000 });
    const pills = page.getByTestId('info-stack-pills').first();
    await expect(pills).toBeVisible();
    const firstPill = pills.locator('button, [role="button"]').first();
    await expect(firstPill).toBeVisible();
    await firstPill.click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  });
});
