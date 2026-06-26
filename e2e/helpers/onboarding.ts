import { expect, type Page } from '@playwright/test';

/** Skip onboarding and land on Library (explore demo, no auto-workspace). */
export async function skipOnboardingToLibrary(page: Page) {
  await page.getByTestId('landing-get-started').click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Self-Learner' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Deeply understand material' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-skip-explore').click();
  await expect(page.getByTestId('nav-library')).toBeVisible({ timeout: 15_000 });
}
