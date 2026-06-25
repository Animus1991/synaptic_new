import { test, expect } from '@playwright/test';

const GREEK_SYLLABUS = `
ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ
E-class Μαθήματος: https://eclass.uoa.gr/courses/ECON196
E-mail Επικοινωνίας: nstoupo@econ.uoa.gr

ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ
Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.
Indicator        Value
Inflation        3.2%
Unemployment     6.1%

ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ
Α π ό λ υ τ α π λ ε ο ν ε κ τ ή μ α τ α και διεθνές εμπόριο.

Βιβλιογραφία
[1] Krugman, P. (2018). International Economics. Pearson.
`.trim();

async function skipOnboarding(page: import('@playwright/test').Page) {
  await page.getByTestId('landing-get-started').click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Self-Learner' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Deeply understand material' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Skip — explore the demo first' }).click();
}

test.describe('Greek syllabus paste → workspace reader', () => {
  test('renders lecture sections after upload and supports outline topic edit', async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();

    await page.getByTestId('upload-paste').fill(GREEK_SYLLABUS);
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });

    const firstTopic = page.getByTestId('outline-topic-edit-0');
    if (await firstTopic.isVisible()) {
      await firstTopic.fill('Διεθνής Οικονομική — Εισαγωγή');
    }

    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });

    await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });

    await expect(page.getByText('Study concept')).not.toBeVisible();
    await expect(page.getByText(/διεθν|οικονομ|εμπορ/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/α π ό λ υ τ α/i)).not.toBeVisible();
    await expect(page.getByText(/πλεονεκτήματα|πλεονεκτηματα/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/βιβλιογραφία|krugman/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('workspace-tool-scratchpad').click();
    await expect(page.getByTestId('workspace-empty-state')).toHaveAttribute('data-has-source', 'true');
    await expect(page.getByTestId('workspace-empty-upload')).not.toBeVisible();
  });
});
