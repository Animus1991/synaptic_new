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
  await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
}

async function dismissUploadModalIfOpen(page: Page) {
  const heading = page.getByRole('heading', { name: /Upload Learning Material/i });
  if (!(await heading.isVisible().catch(() => false))) return;
  const cancel = page.getByRole('button', { name: /^Cancel$/i });
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click();
  } else {
    await heading.locator('..').locator('..').getByRole('button').first().click();
  }
  await expect(heading).toBeHidden({ timeout: 5000 });
}

async function dismissProductTourIfOpen(page: Page) {
  const skip = page.getByRole('button', { name: /skip tour|παράλειψη/i });
  if (!(await skip.isVisible().catch(() => false))) return;
  await skip.click();
  await expect(skip).toBeHidden({ timeout: 5000 });
}

/** Close upload modal + product tour that block Shell interactions after onboarding. */
export async function dismissBlockingShellOverlays(page: Page) {
  await dismissProductTourIfOpen(page);
  await page.waitForTimeout(600);
  await dismissProductTourIfOpen(page);
  await dismissUploadModalIfOpen(page);
}

/** Complete onboarding without demo seed — no uploaded source (empty workspace). */
export async function skipOnboardingNoDemo(page: Page) {
  await page.getByTestId('landing-get-started').click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Self-Learner' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Deeply understand material' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: /Upload My First Material|Ανέβασμα Πρώτου Υλικού/i }).click();
  await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
  await dismissBlockingShellOverlays(page);
}

/** Open study workspace from the global command palette (nav-workspace is hidden until open). */
export async function openStudyWorkspaceViaPalette(page: Page) {
  await dismissBlockingShellOverlays(page);
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: /Study Workspace/i }).click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 30_000 });
}
