import { test, expect } from '@playwright/test';
import { dismissBlockingShellOverlays, skipOnboardingToLibrary } from './helpers/onboarding';

async function openDemoDashboard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await skipOnboardingToLibrary(page);
  await dismissBlockingShellOverlays(page);
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('syllabus-coverage-widget')).toBeVisible({ timeout: 15_000 });
}

test.describe('Sprint E — dashboard smart CTAs and coverage deep links', () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ viewport: { width: 1280, height: 720 } });

  test('smart CTA strip is visible on dashboard with demo content', async ({ page }) => {
    await openDemoDashboard(page);
    await expect(page.getByTestId('dashboard-smart-cta-strip')).toBeVisible();
    await expect(page.getByTestId('syllabus-coverage-widget')).toBeVisible();
  });

  test('coverage practice deep-links workspace tool for selected topic', async ({ page }) => {
    await openDemoDashboard(page);
    const practiceBtn = page.getByTestId('coverage-practice-t4');
    await expect(practiceBtn).toBeVisible();
    await practiceBtn.click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    // Demo exam is within 14 days — coverage practice routes to simulator exam-prep.
    await expect(page.locator('[data-testid="workspace-tool-frame"][data-tool="simulator"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('exam-prep-panel')).toBeVisible({ timeout: 15_000 });
  });

  test('exam prep smart CTA opens simulator exam-prep tab', async ({ page }) => {
    await openDemoDashboard(page);
    const examCta = page.getByTestId('dashboard-smart-cta-scheduler-exam-prep');
    await expect(examCta).toBeVisible();
    await examCta.click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-testid="workspace-tool-frame"][data-tool="simulator"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('simulator-tab-exam-prep')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('exam-prep-panel')).toBeVisible({ timeout: 15_000 });
  });
});
