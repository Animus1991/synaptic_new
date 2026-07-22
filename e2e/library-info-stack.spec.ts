import { test, expect } from '@playwright/test';

/** OPT-L6 — Library topic / prerequisite chips open workspace with human titles. */
test.describe('Library InfoStack (OPT-L1/L6)', () => {
  test('demo library shows human prerequisite titles (not raw t1 ids)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.getByRole('button', { name: /demo|δοκίμασε/i }).click();
    await expect(page.getByTestId('library-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('library-demo-sandbox-hint')).toBeVisible();

    const stacks = page.getByTestId('library-info-stacks');
    await expect(stacks).toBeVisible({ timeout: 15_000 });

    const pills = page.getByTestId('info-stack-pills');
    await expect(pills).toBeVisible();
    const pillText = await pills.innerText();
    expect(pillText).not.toMatch(/\bt\d+\b/i);

    const firstPill = pills.locator('button, [role="button"]').first();
    if (await firstPill.isVisible().catch(() => false)) {
      await firstPill.click();
      await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    }
  });
});
