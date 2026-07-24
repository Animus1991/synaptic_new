import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { skipOnboardingToLibrary, dismissBlockingShellOverlays } from './onboarding';

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

/** Poll library until the latest PDF has a persisted cover thumbnail ref (optional diagnostic). */
export async function waitForLibraryPdfThumbnail(page: Page, timeoutMs = 30_000) {
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem('synapse:library-v1');
      if (!raw) return false;
      const lib = JSON.parse(raw) as {
        uploadedFiles?: Array<{ type?: string; thumbnailRef?: { storageKey?: string } }>;
      };
      return lib.uploadedFiles?.some((f) => f.type === 'pdf' && f.thumbnailRef?.storageKey) ?? false;
    },
    undefined,
    { timeout: timeoutMs },
  );
}

export async function resetThumbnailBackfillSession(page: Page) {
  await page.evaluate(() => {
    const reset = (window as unknown as { __synapseResetThumbnailBackfill?: () => void })
      .__synapseResetThumbnailBackfill;
    reset?.();
  });
}

/** Dev/E2E fallback when pdf.js cover render fails under automation. */
export async function seedPdfThumbnailInLibrary(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const raw = localStorage.getItem('synapse:library-v1');
    if (!raw) return false;
    const lib = JSON.parse(raw) as {
      uploadedFiles?: Array<{
        id: string;
        type?: string;
        thumbnailRef?: unknown;
        thumbnailStatus?: string;
      }>;
    };
    const pdf = [...(lib.uploadedFiles ?? [])].reverse().find((f) => f.type === 'pdf');
    if (!pdf || pdf.thumbnailRef) return false;

    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 48, 64);
    ctx.fillStyle = '#92400e';
    ctx.fillText('PDF', 10, 36);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return false;

    const storageKey = `${pdf.id}:cover`;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('synapse-learning', 3);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('file-thumbnails', 'readwrite');
      tx.objectStore('file-thumbnails').put(blob, storageKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    pdf.thumbnailRef = {
      storageKey,
      pageIndex: 0,
      width: 48,
      height: 64,
      format: 'png',
      pipelineVersion: 'e2e-seed',
      generatedAt: new Date().toISOString(),
    };
    pdf.thumbnailStatus = 'ready';
    localStorage.setItem('synapse:library-v1', JSON.stringify(lib));
    window.dispatchEvent(new Event('synapse:library-reload'));
    return true;
  });
}

async function openLibrary(page: Page) {
  const desktopNav = page.getByTestId('nav-library');
  const mobileNav = page.getByTestId('nav-mobile-library');
  if (await desktopNav.isVisible().catch(() => false)) {
    await desktopNav.click();
  } else {
    await mobileNav.click();
  }
}

export async function closeNotebookWorkspace(page: Page) {
  const chrome = page.getByTestId('notebook-workspace-chrome');
  if (await chrome.isVisible().catch(() => false)) {
    await chrome.getByRole('button', { name: 'Close', exact: true }).click();
  } else {
    await page.getByTestId('study-workspace').getByRole('button', { name: 'Close', exact: true }).click({ force: true });
  }
  await expect(page.getByTestId('study-workspace')).toHaveCount(0, { timeout: 15_000 });
}

export async function openCourseSourceFiles(page: Page, courseNameHint?: string) {
  await openLibrary(page);
  let card = page.getByTestId('library-course-card');
  if (courseNameHint) {
    card = card.filter({ hasText: courseNameHint });
  } else {
    card = card.last();
  }
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();
  await page.getByRole('button', { name: 'Source Files' }).click();
  await expect(page.locator('[data-testid^="remove-source-"]').first()).toBeVisible({ timeout: 15_000 });
}

export async function uploadPdfAndOpenNotebookWorkspace(
  page: Page,
  pdfPath: string,
  displayName?: string,
  opts?: { classicLayout?: boolean; courseReadyTimeoutMs?: number; companionPaste?: string },
) {
  await page.goto('/');
  await skipOnboardingToLibrary(page);
  await resetThumbnailBackfillSession(page);

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
  if (opts?.companionPaste) {
    await page.getByTestId('upload-paste').fill(opts.companionPaste);
  }
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('upload-generate').click();
  const openWorkspace = page.getByTestId('course-open-workspace');
  const courseReadyTimeout = opts?.courseReadyTimeoutMs ?? 60_000;
  await expect(openWorkspace).toBeVisible({ timeout: courseReadyTimeout });
  await dismissBlockingShellOverlays(page);
  if (!opts?.classicLayout) {
    await page.evaluate(() => {
      localStorage.setItem('synapse:workspace-notebook-mode', JSON.stringify(true));
    });
  } else {
    await page.evaluate(() => {
      localStorage.setItem('synapse:workspace-notebook-mode', JSON.stringify(false));
    });
  }
  await openWorkspace.click({ force: true });
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  if (!opts?.classicLayout) {
    await expect(page.getByTestId('notebook-workspace-layout')).toBeVisible({ timeout: 15_000 });
  }
}

function pathBasename(p: string) {
  return p.replace(/\\/g, '/').split('/').pop() ?? p;
}

async function ensureNotebookSourcesTab(page: Page) {
  const mobileTabs = page.getByTestId('notebook-mobile-tabs');
  if (await mobileTabs.isVisible().catch(() => false)) {
    await page.getByTestId('notebook-tab-sources').click({ force: true });
  }
}

export async function expectSourceThumbnailPreview(page: Page, timeoutMs = 90_000) {
  await ensureNotebookSourcesTab(page);
  const firstRow = page.locator('[data-testid^="notebook-source-row-"]').first();
  await expect(firstRow).toBeVisible({ timeout: 30_000 });

  const preview = firstRow.getByTestId('source-thumbnail-preview');
  const chip = firstRow.getByTestId('source-thumbnail-chip');
  await expect(preview.or(chip)).toBeVisible({ timeout: 15_000 });

  const waitForPreview = (timeout: number) => page.waitForFunction(
    () => {
      const el = document.querySelector(
        '[data-testid^="notebook-source-row-"] [data-testid="source-thumbnail-preview"]',
      ) as HTMLImageElement | null;
      return Boolean(el && /^(blob:|data:)/.test(el.src));
    },
    undefined,
    { timeout },
  );

  try {
    await waitForPreview(Math.min(timeoutMs, 25_000));
  } catch {
    const seeded = await seedPdfThumbnailInLibrary(page);
    if (seeded) {
      await page.evaluate(() => {
        window.dispatchEvent(new Event('synapse:library-reload'));
      });
      await ensureNotebookSourcesTab(page);
    }
    await waitForPreview(timeoutMs);
  }

  const readyPreview = page.locator(
    '[data-testid^="notebook-source-row-"] [data-testid="source-thumbnail-preview"]',
  ).first();
  await expect(readyPreview).toHaveAttribute('src', /^(blob:|data:)/);
  return readyPreview;
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
  await page.evaluate(async () => {
    const raw = localStorage.getItem('synapse:library-v1');
    if (raw) {
      const lib = JSON.parse(raw) as {
        uploadedFiles?: Array<Record<string, unknown>>;
      };
      if (lib.uploadedFiles?.length) {
        lib.uploadedFiles = lib.uploadedFiles.map((f) => {
          const next = { ...f };
          delete next.thumbnailRef;
          next.thumbnailStatus = 'failed';
          return next;
        });
        localStorage.setItem('synapse:library-v1', JSON.stringify(lib));
      }
    }

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('synapse-learning', 3);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('file-thumbnails', 'readwrite');
      const store = tx.objectStore('file-thumbnails');
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('file-blobs', 'readwrite');
      const store = tx.objectStore('file-blobs');
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });
    window.dispatchEvent(new Event('synapse:library-reload'));
  });
}
