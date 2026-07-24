import { expect, type Page } from '@playwright/test';

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
