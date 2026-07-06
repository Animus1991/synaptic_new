import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import { openReaderInWorkspace } from './helpers/workspace';

const FIXTURE_DIR = path.dirname(fileURLToPath(import.meta.url));
const GREEK_PDF = path.join(FIXTURE_DIR, 'fixtures', 'greek-syllabus-min.pdf');

test.describe('Greek syllabus PDF upload → workspace reader (Sprint B)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('extracts text from PDF file input and opens workspace', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('nav-library').click();
    await page.getByTestId('library-upload').click();

    await page.getByTestId('upload-file-input').setInputFiles(GREEK_PDF);
    await expect(page.getByText('greek-syllabus-min.pdf')).toBeVisible();
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('outline-topic-edit-0')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/διεθν|οικονομ|εμπορ|Inflation|Krugman|Bibliography/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });

    await openReaderInWorkspace(page);
    await expect(page.getByTestId('reader-structured-body')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/διεθν|οικονομ|πλεονεκ|Inflation|Krugman|Bibliography|International/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
