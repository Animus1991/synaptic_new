import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const NOTES = `
# Behavioral Economics

Waiting costs shape intertemporal choice.
Present bias can explain why people prefer smaller sooner rewards.
`.trim();

test.describe('Library course review Continue', () => {
  test('library card → course review → workspace opens; back escapes overlay', async ({ page }) => {
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
    await expect(page.getByTestId('library-course-card').first()).toBeVisible();

    await page.getByTestId('library-course-card').first().click();
    await expect(page.getByTestId('course-open-workspace')).toBeVisible();

    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('workspace-boot-shell').or(page.getByTestId('study-workspace'))).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });

    await page.getByLabel('Close').first().click();
    await expect(page.getByTestId('course-open-workspace')).toBeVisible();
    await page.getByTestId('course-back').click();
    await expect(page.getByTestId('library-course-card').first()).toBeVisible();
  });

  test('demo button lands on library without auto-opening workspace', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /demo|δοκίμασε/i }).click();
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('study-workspace')).toHaveCount(0);
    await expect(page.getByTestId('workspace-boot-shell')).toHaveCount(0);
  });
});
