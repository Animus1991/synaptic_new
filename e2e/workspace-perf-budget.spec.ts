import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const NOTES = `
# Performance Budget Fixture

Intertemporal choice and present bias.
`.trim();

/** B11 — Continue → workspace interactive budget (relaxed for Vite dev; prod target 1.2s). */
const INTERACTIVE_BUDGET_MS = process.env.CI ? 8_000 : 12_000;

test.describe('Workspace perf budget (B11)', () => {
  test('course Continue → study-workspace within budget', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('library-upload').click();
    await page.getByTestId('upload-paste').fill(NOTES);
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });

    await page.getByTestId('course-back').click();
    await page.getByTestId('library-course-card').first().click();
    await expect(page.getByTestId('course-open-workspace')).toBeVisible();

    const t0 = Date.now();
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('workspace-step-rail-0').or(page.getByTestId('workspace-tool-frame'))).toBeVisible({
      timeout: 15_000,
    });
    const elapsed = Date.now() - t0;

    expect(elapsed, `Expected interactive workspace ≤ ${INTERACTIVE_BUDGET_MS}ms, got ${elapsed}ms`).toBeLessThan(
      INTERACTIVE_BUDGET_MS,
    );
  });
});
