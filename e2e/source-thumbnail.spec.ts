import { test, expect, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import {
  expectSourceThumbnailPreview,
  idbThumbnailKeys,
  stripThumbnailsForLegacyChip,
  uploadPdfAndOpenNotebookWorkspace,
} from './helpers/sourceThumbnail';

const FIXTURE_DIR = path.dirname(fileURLToPath(import.meta.url));
const GREEK_PDF = path.join(FIXTURE_DIR, 'fixtures', 'greek-syllabus-min.pdf');
const PDF_50 = path.join(FIXTURE_DIR, 'fixtures', 'syllabus-50page.pdf');
const PDF_300 = path.join(FIXTURE_DIR, 'fixtures', 'syllabus-300page.pdf');
const PDF_SCANNED = path.join(FIXTURE_DIR, 'fixtures', 'scanned-1page.pdf');

test.describe('PDF source page-preview thumbnails (Sprint L17 / P0-07)', () => {
  test.describe.configure({ timeout: 180_000 });

  test('1-page PDF shows cover preview in notebook sources', async ({ page }) => {
    await uploadPdfAndOpenNotebookWorkspace(page, GREEK_PDF);
    await expectSourceThumbnailPreview(page);
  });

  test('50-page PDF shows cover preview', async ({ page }) => {
    await uploadPdfAndOpenNotebookWorkspace(page, PDF_50);
    await expectSourceThumbnailPreview(page, 30_000);
  });

  test('300-page PDF shows cover preview', async ({ page }) => {
    await uploadPdfAndOpenNotebookWorkspace(page, PDF_300);
    await expectSourceThumbnailPreview(page, 60_000);
  });

  test('scanned image-only PDF shows page-1 preview', async ({ page }) => {
    test.slow();
    await uploadPdfAndOpenNotebookWorkspace(page, PDF_SCANNED, undefined, { courseReadyTimeoutMs: 120_000 });
    await expectSourceThumbnailPreview(page, 60_000);
  });

  test('Greek/Latin filename PDF shows cover preview', async ({ page }) => {
    await uploadPdfAndOpenNotebookWorkspace(page, GREEK_PDF, 'Συλλαβάριο-Latin.pdf');
    await expectSourceThumbnailPreview(page);
  });

  test('mobile Sources tab — thumbnail is visible and not clipped', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();
    await uploadPdfAndOpenNotebookWorkspace(page, GREEK_PDF);
    await page.getByTestId('notebook-tab-sources').click({ force: true });
    const preview = await expectSourceThumbnailPreview(page);
    const box = await preview.boundingBox();
    const row = page.locator('[data-testid^="notebook-source-row-"]').first();
    const rowBox = await row.boundingBox();
    expect(box).toBeTruthy();
    expect(rowBox).toBeTruthy();
    if (box && rowBox) {
      expect(box.y).toBeGreaterThanOrEqual(rowBox.y - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(rowBox.y + rowBox.height + 1);
      expect(box.x).toBeGreaterThanOrEqual(rowBox.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
    }
    await context.close();
  });

  test('delete source removes IDB thumbnail row', async ({ page }) => {
    await uploadPdfAndOpenNotebookWorkspace(page, GREEK_PDF);
    await expectSourceThumbnailPreview(page);
    const keysBefore = await idbThumbnailKeys(page);
    expect(keysBefore.length).toBeGreaterThan(0);

    await page.getByTestId('study-workspace').getByRole('button', { name: 'Close', exact: true }).click({ force: true });
    await expect(page.getByTestId('study-workspace')).toHaveCount(0, { timeout: 15_000 });
    await page.getByTestId('nav-library').click();
    const courseCard = page.locator('[data-testid^="course-card-"]').first();
    await courseCard.click();
    const removeBtn = page.locator('[data-testid^="remove-source-"]').first();
    const fileId = (await removeBtn.getAttribute('data-testid'))?.replace('remove-source-', '') ?? '';
    await removeBtn.click();
    await page.getByTestId('course-remove-source-dialog-confirm').click();
    await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 15_000 });

    const keysAfter = await idbThumbnailKeys(page);
    const thumbKey = `${fileId}:cover`;
    expect(keysAfter).not.toContain(thumbKey);
  });

  test('legacy library without thumbnail shows typed chip without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await uploadPdfAndOpenNotebookWorkspace(page, GREEK_PDF);
    await stripThumbnailsForLegacyChip(page);
    await expect(page.getByTestId('source-thumbnail-chip').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('source-thumbnail-preview')).toHaveCount(0);
    await expect(page.getByTestId('source-thumbnail-reprocess-hint').first()).toBeVisible();
    expect(errors.filter((e) => /thumbnail/i.test(e))).toHaveLength(0);
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

test.describe('Classic layout inline chat drawer (CHAT-06)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('opens embedded agent in drawer without Agent nav redirect', async ({ page }) => {
    await uploadPdfAndOpenNotebookWorkspace(page, GREEK_PDF, undefined, { classicLayout: true });
    await expect(page.getByTestId('notebook-workspace-layout')).toHaveCount(0);

    await page.getByTestId('study-workspace').getByRole('button', { name: 'Agent', exact: true }).click();
    await expect(page.getByTestId('classic-chat-drawer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('workspace-inline-agent')).toBeVisible();
    await expect(page.getByTestId('agent-page')).toHaveCount(0);
    await expect(page.getByTestId('agent-embedded')).toBeVisible();

    await page.getByTestId('classic-chat-drawer-close').click();
    await expect(page.getByTestId('classic-chat-drawer')).toHaveCount(0);
  });
});
