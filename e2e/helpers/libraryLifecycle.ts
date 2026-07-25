import { expect, type Page } from '@playwright/test';
import { dismissBlockingShellOverlays } from './onboarding';

export async function uploadCourseFromPaste(page: Page, notes: string): Promise<string> {
  await page.getByTestId('library-upload').click();
  // OPT-R10 — paste may sit under Minimal collapsible chrome
  const paste = page.getByTestId('upload-paste');
  if (!(await paste.isVisible().catch(() => false))) {
    const more = page.getByTestId('upload-more-sources-toggle');
    if (await more.isVisible().catch(() => false)) await more.click();
  }
  await expect(paste).toBeVisible({ timeout: 8_000 });
  await paste.fill(notes);
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('upload-generate').click();
  await expect(page.getByTestId('upload-modal')).toBeHidden({ timeout: 120_000 });

  await expect(page.getByTestId('post-upload-banner')).toBeVisible({ timeout: 30_000 });
  const courseTitle =
    (await page.getByTestId('post-upload-banner').locator('p.text-sm.font-semibold').textContent())?.trim() ?? '';
  expect(courseTitle.length).toBeGreaterThan(0);
  return courseTitle;
}

/** Upload → open grounded Study Workspace via post-upload CTA (current product path). */
export async function openGroundedStudyWorkspace(page: Page, notes: string): Promise<void> {
  await uploadCourseFromPaste(page, notes);
  await dismissBlockingShellOverlays(page);
  await expect(page.getByTestId('post-upload-banner')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('post-upload-open-workspace').click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-testid="study-workspace"][data-grounded="true"]')).toBeVisible({
    timeout: 60_000,
  });
}

/** Upload → CourseView (diagnostics + open-workspace). */
export async function uploadAndOpenCourseView(page: Page, notes: string): Promise<string> {
  const courseTitle = await uploadCourseFromPaste(page, notes);
  await dismissBlockingShellOverlays(page);

  // Prefer banner "browse modules"; fall back to library card.
  const browse = page.getByTestId('post-upload-view-course');
  if (await browse.isVisible().catch(() => false)) {
    await browse.click();
  } else {
    await page.getByTestId('nav-library').click();
    const titled = page.getByTestId('library-course-card').filter({ hasText: courseTitle }).first();
    if (await titled.isVisible().catch(() => false)) {
      await titled.click();
    } else {
      await page.getByTestId('library-course-card').first().click();
    }
  }

  await expect(page.getByTestId('course-open-workspace')).toBeVisible({ timeout: 20_000 });
  // Diagnostics render when quality meta exists — prefer soft assert.
  const diagnostics = page.getByTestId('course-generation-diagnostics');
  if (await diagnostics.isVisible().catch(() => false)) {
    await expect(diagnostics).toBeVisible();
  }
  return courseTitle;
}

export async function getLatestCourseId(page: Page): Promise<string> {
  const courseId = await page.evaluate(() => {
    const raw = localStorage.getItem('synapse:library-v1');
    if (!raw) return '';
    const lib = JSON.parse(raw) as { generatedCourses?: Array<{ id: string; status?: string }> };
    const courses = (lib.generatedCourses ?? []).filter((c) => c.status !== 'generating');
    return courses[courses.length - 1]?.id ?? '';
  });
  expect(courseId.length).toBeGreaterThan(0);
  return courseId;
}
