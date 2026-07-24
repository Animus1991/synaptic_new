import { test, expect } from '@playwright/test';
import {
  clearAppStorage,
  completeOnboardingScheduleWithUpload,
  dismissBlockingShellOverlays,
  startOnboardingFromLanding,
} from './helpers/onboarding';

test.describe('B2 Onboarding — resume draft + upload handoff', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test('resumes wizard draft after reload', async ({ page }) => {
    await startOnboardingFromLanding(page);
    await page.getByTestId('onboarding-continue').click();
    await page.getByTestId('onboarding-role-university').click();

    await page.reload();

    await expect(page.getByTestId('onboarding-resume-hint')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('onboarding-role-university')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('onboarding-next')).toBeVisible();
  });

  test('schedule upload CTA opens shared UploadModal', async ({ page }) => {
    await completeOnboardingScheduleWithUpload(page);
    await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
    await dismissBlockingShellOverlays(page);
    await expect(page.getByTestId('upload-modal')).toBeHidden();
  });

  test('completed onboarding persists profile across reload', async ({ page }) => {
    await completeOnboardingScheduleWithUpload(page);
    await dismissBlockingShellOverlays(page);

    const profile = await page.evaluate(() => {
      const raw = localStorage.getItem('synapse:user-profile-v1');
      return raw ? JSON.parse(raw) : null;
    });
    expect(profile?.onboardingComplete).toBe(true);
    expect(profile?.segment).toBe('selflearner');

    await page.reload();
    await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('onboarding-continue')).toBeHidden();
  });
});
