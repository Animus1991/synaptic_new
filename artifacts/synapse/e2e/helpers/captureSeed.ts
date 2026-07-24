/**
 * OPT-R18 — ensure a library course exists for M20/C8 workspace screenshot rows.
 * Zero product removals: uses explore-demo seed, then paste-upload fallback.
 */
import { expect, type Page } from '@playwright/test';
import { dismissBlockingShellOverlays } from './onboarding';
import { waitForLibraryReady } from './a11y';

const CAPTURE_SEED_NOTES = `
# Spaced Repetition Capture Seed

Spaced repetition schedules reviews at increasing intervals.
Retrieval practice strengthens long-term memory better than re-reading.
Active recall and interleaving improve transfer across related topics.
`.trim();

async function goLibrary(page: Page) {
  const desktop = page.getByTestId('nav-library');
  const mobile = page.getByTestId('nav-mobile-library');
  if (await desktop.isVisible().catch(() => false)) {
    await desktop.click({ force: true });
  } else if (await mobile.isVisible().catch(() => false)) {
    await mobile.click({ force: true });
  }
  await waitForLibraryReady(page);
  const coursesTab = page.getByTestId('library-tab-courses');
  if (await coursesTab.isVisible().catch(() => false)) {
    await coursesTab.click({ force: true });
  }
}

async function hasCourseCard(page: Page, timeoutMs = 3_000): Promise<boolean> {
  return page
    .getByTestId('library-course-card')
    .first()
    .isVisible({ timeout: timeoutMs })
    .catch(() => false);
}

/** Expand OPT-R10 collapsible so paste/YouTube inputs are in the DOM under Minimal. */
async function ensureUploadPasteVisible(page: Page) {
  const paste = page.getByTestId('upload-paste');
  if (await paste.isVisible().catch(() => false)) return;
  const more = page.getByTestId('upload-more-sources-toggle');
  if (await more.isVisible().catch(() => false)) {
    await more.click();
  }
  await expect(paste).toBeVisible({ timeout: 8_000 });
}

async function seedViaPasteUpload(page: Page): Promise<boolean> {
  await goLibrary(page);
  const uploadBtn = page.getByTestId('library-upload');
  if (!(await uploadBtn.isVisible().catch(() => false))) return false;
  await uploadBtn.click();
  await expect(page.getByTestId('upload-modal')).toBeVisible({ timeout: 15_000 });
  await ensureUploadPasteVisible(page);
  await page.getByTestId('upload-paste').fill(CAPTURE_SEED_NOTES);
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('upload-generate').click();
  await expect(page.getByTestId('upload-modal')).toBeHidden({ timeout: 120_000 });
  await dismissBlockingShellOverlays(page);
  await goLibrary(page);
  return hasCourseCard(page, 20_000);
}

async function retryExploreDemoFromDashboard(page: Page): Promise<boolean> {
  const dash = page.getByTestId('nav-dashboard');
  if (await dash.isVisible().catch(() => false)) {
    await dash.click({ force: true });
  }
  const explore = page.getByRole('button', { name: /explore demo|εξερεύνησε demo/i });
  if (!(await explore.first().isVisible().catch(() => false))) return false;
  await explore.first().click();
  await dismissBlockingShellOverlays(page);
  await goLibrary(page);
  return hasCourseCard(page, 12_000);
}

/**
 * After onboarding (or mid-capture), guarantee ≥1 `library-course-card`.
 * Returns true when a course is available for workspace rows.
 */
export async function ensureCaptureDemoCourse(page: Page): Promise<boolean> {
  await dismissBlockingShellOverlays(page);
  await goLibrary(page);

  if (await hasCourseCard(page, 8_000)) return true;

  // Deep-link style re-enable (same as ?demo=1 / Dashboard Explore Demo)
  if (await retryExploreDemoFromDashboard(page)) return true;

  // Fallback: real generated course via paste (works when demo toggle is off)
  if (await seedViaPasteUpload(page)) return true;

  await goLibrary(page);
  return hasCourseCard(page, 5_000);
}
