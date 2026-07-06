import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const FIXTURE_DIR = path.dirname(fileURLToPath(import.meta.url));
const GREEK_PDF = path.join(FIXTURE_DIR, 'fixtures', 'greek-syllabus-min.pdf');

test.describe('PDF source page-preview thumbnails (Sprint L17)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('shows cover preview in notebook sources after PDF upload', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();
    await page.getByTestId('upload-file-input').setInputFiles(GREEK_PDF);
    await expect(page.getByText('greek-syllabus-min.pdf')).toBeVisible();
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('notebook-workspace-layout')).toBeVisible({ timeout: 15_000 });

    const preview = page.getByTestId('source-thumbnail-preview').first();
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(preview).toHaveAttribute('src', /^(blob:|data:)/);
  });

  test('falls back to typed chip when preview is unavailable', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();
    await page.getByTestId('upload-paste').fill(
      'Supply and demand determine market equilibrium. Producers supply goods; consumers demand them.',
    );
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('notebook-workspace-layout')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('source-thumbnail-chip').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('source-thumbnail-preview')).toHaveCount(0);
  });
});
