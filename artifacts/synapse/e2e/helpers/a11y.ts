import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { skipOnboardingToLibrary } from './onboarding';

export const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

export type AppTheme = 'dark' | 'light' | 'spectrum' | 'minimal' | 'minimal-dark';

/** Full WCAG 2.1 A/AA scan including color-contrast. */
export function axeBuilder(page: Page) {
  return new AxeBuilder({ page }).withTags([...A11Y_TAGS]);
}

export function blockingViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
}

export async function setAppTheme(page: Page, theme: AppTheme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

export async function waitForLibraryReady(page: Page) {
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('[data-testid="library-course-card"]');
    if (cards.length === 0) return true;
    return Array.from(cards).every((c) => getComputedStyle(c).opacity === '1');
  }, { timeout: 8000 }).catch(() => undefined);
}

export async function dismissProductTourIfOpen(page: Page) {
  const skip = page.getByRole('button', { name: /skip tour|παράλειψη/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

/** Open study workspace from the library (caller must already be on library). */
export async function openWorkspaceFromLibrary(page: Page) {
  const courseCard = page.getByTestId('library-course-card').first();
  await expect(courseCard).toBeVisible({ timeout: 15_000 });
  await courseCard.click();

  const openWs = page.getByTestId('course-open-workspace');
  await expect(openWs).toBeVisible({ timeout: 15_000 });
  await openWs.click();

  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('workspace-dock')).toBeVisible({ timeout: 45_000 });
}

/** Library → course review → study workspace (demo course). */
export async function enterStudyWorkspace(page: Page) {
  await page.goto('/');
  await skipOnboardingToLibrary(page);
  await dismissProductTourIfOpen(page);
  await waitForLibraryReady(page);
  await openWorkspaceFromLibrary(page);
}

export function formatAxeViolations(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return JSON.stringify(
    violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
      help: v.help,
    })),
    null,
    2,
  );
}
