import { expect, type Page } from '@playwright/test';

/** Clear Synapse localStorage keys for an isolated onboarding run. */
export async function clearAppStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** Open onboarding from landing (no-op if draft already routed to onboarding). */
export async function startOnboardingFromLanding(page: Page) {
  const continueBtn = page.getByTestId('onboarding-continue');
  if (await continueBtn.isVisible().catch(() => false)) return;

  const getStarted = page
    .getByTestId('landing-get-started')
    .or(page.getByTestId('landing-get-started-primary'));
  const onLanding = await getStarted.first().isVisible().catch(() => false);
  if (onLanding) {
    await getStarted.first().click();
  }
  await expect(continueBtn).toBeVisible({ timeout: 20_000 });
}

/** Walk wizard steps through schedule and open the shared UploadModal. */
export async function completeOnboardingScheduleWithUpload(page: Page) {
  await startOnboardingFromLanding(page);
  await page.getByTestId('onboarding-continue').click();
  await page.getByTestId('onboarding-role-selflearner').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-goal-understand').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-upload').click();
  await expect(page.getByTestId('upload-modal')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('upload-paste')).toBeVisible();
}

/** Skip onboarding and land on Library (explore demo, no auto-workspace). */
export async function skipOnboardingToLibrary(page: Page) {
  await startOnboardingFromLanding(page);
  await page.getByTestId('onboarding-continue').click();
  await page.getByTestId('onboarding-role-selflearner').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-goal-understand').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-explore-demo').click();
  await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
  // OPT-R18 — demo courses are in-memory; wait briefly so Library can paint cards.
  await page
    .getByTestId('library-course-card')
    .first()
    .waitFor({ state: 'visible', timeout: 12_000 })
    .catch(() => undefined);
}

async function dismissUploadModalIfOpen(page: Page) {
  const modal = page.getByTestId('upload-modal');
  if (!(await modal.isVisible().catch(() => false))) return;
  const close = modal.getByRole('button').first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
  await expect(modal).toBeHidden({ timeout: 5000 });
}
async function dismissProductTourIfOpen(page: Page) {
  for (let step = 0; step < 8; step += 1) {
    const overlay = page.getByTestId('product-tour-overlay');
    if (!(await overlay.isVisible().catch(() => false))) return;
    const skip = page.getByRole('button', { name: /skip|παράλειψη/i });
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
    } else {
      const next = page.getByTestId('product-tour-next');
      if (await next.isVisible().catch(() => false)) {
        await next.click();
      } else {
        await page.getByRole('button', { name: 'Close', exact: true }).click();
      }
    }
    await page.waitForTimeout(400);
  }
}

/** Close upload modal + product tour that block Shell interactions after onboarding. */
export async function dismissBlockingShellOverlays(page: Page) {
  await dismissProductTourIfOpen(page);
  await page.waitForTimeout(600);
  await dismissProductTourIfOpen(page);
  await dismissUploadModalIfOpen(page);
}

/** Complete onboarding without demo seed — opens UploadModal on dashboard. */
export async function skipOnboardingNoDemo(page: Page) {
  await completeOnboardingScheduleWithUpload(page);
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
