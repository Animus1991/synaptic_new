import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const GREEK_SYLLABUS = `
ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ
ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ
Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.

ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ
Απόλυτα πλεονεκτήματα και διεθνές εμπόριο.

Βιβλιογραφία
[1] Krugman, P. (2018). International Economics. Pearson.
`.trim();

async function openGreekWorkspace(page: import('@playwright/test').Page) {
  await page.getByTestId('nav-library').click();
  await page.getByTestId('library-upload').click();
  await page.getByTestId('upload-paste').fill(GREEK_SYLLABUS);
  await page.getByTestId('upload-continue').click();
  await page.getByTestId('upload-generate').click();
  await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('course-open-workspace').click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('cognitive-reader')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('reader-section-nav')).toBeVisible({ timeout: 15_000 });
}

test.describe('Reader ↔ lesson rail sync (E2E)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('reader section nav selects matching workspace step', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await openGreekWorkspace(page);

    const sectionNav = page.getByTestId('reader-section-nav');
    const lecture2Chip = sectionNav.getByRole('button', { name: /ΔΙΑΛΕΞΗ 2|διάλεξη 2/i });
    await expect(lecture2Chip).toBeVisible();
    await lecture2Chip.click();

    const stepRail1 = page.getByTestId('workspace-step-rail-1');
    await expect(stepRail1).toHaveClass(/accent-cyan/);
  });

  test('workspace step rail keeps reader on lecture sections', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await openGreekWorkspace(page);

    await page.getByTestId('workspace-step-rail-0').click();
    await expect(page.getByTestId('cognitive-reader')).toBeVisible();
    await expect(page.locator('[data-testid^="reader-section-nav-active-"]').first()).toBeVisible({ timeout: 10_000 });
  });
});
