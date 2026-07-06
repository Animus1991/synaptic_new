import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { skipOnboardingToLibrary } from './onboarding';

async function openLibraryUpload(page: Page) {
  const desktopNav = page.getByTestId('nav-library');
  const mobileNav = page.getByTestId('nav-mobile-library');
  if (await desktopNav.isVisible().catch(() => false)) {
    await desktopNav.click();
  } else if (await mobileNav.isVisible().catch(() => false)) {
    await mobileNav.click();
  }
  await page.getByTestId('library-upload').click();
}

export async function uploadPdfAndOpenNotebookWorkspace(
  page: Page,
  pdfPath: string,
  displayName?: string,
  opts?: { classicLayout?: boolean },
) {
  await page.goto('/');
  await skipOnboardingToLibrary(page);

  await openLibraryUpload(page);
  if (displayName) {
    await page.getByTestId('upload-file-input').setInputFiles({
      name: displayName,
      mimeType: 'application/pdf',
      buffer: readFileSync(pdfPath),
    });
    await expect(page.getByText(displayName)).toBeVisible();
  } else {
    await page.getByTestId('upload-file-input').setInputFiles(pdfPath);
    await expect(page.getByText(pathBasename(pdfPath))).toBeVisible();
  }
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('upload-generate').click();
  const openWorkspace = page.getByTestId('course-open-workspace');
  await expect(openWorkspace).toBeVisible({ timeout: 60_000 });
  if (opts?.classicLayout) {
    await page.evaluate(() => {
      localStorage.setItem('synapse:workspace-notebook-mode', JSON.stringify(false));
    });
  }
  await openWorkspace.click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  if (!opts?.classicLayout) {
    await expect(page.getByTestId('notebook-workspace-layout')).toBeVisible({ timeout: 15_000 });
  }
  const closeCourseStatus = page.getByRole('button', { name: 'Close', exact: true });
  if (await closeCourseStatus.isVisible().catch(() => false)) {
    await closeCourseStatus.click();
  }
}

function pathBasename(p: string) {
  return p.replace(/\\/g, '/').split('/').pop() ?? p;
}

export async function expectSourceThumbnailPreview(page: Page, timeoutMs = 90_000) {
  const mobileTabs = page.getByTestId('notebook-mobile-tabs');
  if (await mobileTabs.isVisible().catch(() => false)) {
    await page.getByTestId('notebook-tab-sources').click();
  }
  const preview = page.getByTestId('source-thumbnail-preview').first();
  const chip = page.getByTestId('source-thumbnail-chip').first();
  await expect(preview.or(chip)).toBeVisible({ timeout: 15_000 });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await preview.isVisible().catch(() => false)) {
      await expect(preview).toHaveAttribute('src', /^(blob:|data:)/);
      return preview;
    }
    await page.waitForTimeout(1000);
  }
  await expect(preview).toBeVisible({ timeout: 1_000 });
  await expect(preview).toHaveAttribute('src', /^(blob:|data:)/);
  return preview;
}

export async function idbThumbnailKeys(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('synapse-learning', 3);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction('file-thumbnails', 'readonly');
      const req = tx.objectStore('file-thumbnails').getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function stripThumbnailsForLegacyChip(page: Page) {
  await page.evaluate(() => {
    const raw = localStorage.getItem('synapse:library-v1');
    if (!raw) return;
    const lib = JSON.parse(raw) as {
      uploadedFiles?: Array<Record<string, unknown>>;
    };
    if (!lib.uploadedFiles?.length) return;
    lib.uploadedFiles = lib.uploadedFiles.map((f) => {
      const next = { ...f };
      delete next.thumbnailRef;
      next.thumbnailStatus = 'failed';
      return next;
    });
    localStorage.setItem('synapse:library-v1', JSON.stringify(lib));
  });
}
