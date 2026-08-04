import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { skipOnboardingToLibrary } from './onboarding';

export const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

export type AppTheme = 'dark' | 'light' | 'spectrum' | 'minimal' | 'minimal-dark';

/** Kill framer entrance opacity wash so axe contrast sees real tokens. */
export async function settleMotionForAxe(page: Page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-a11y-settle', '1');
    // Parent library list wrappers also fade in — wash hits every descendant.
    document.querySelectorAll<HTMLElement>('.app-shell [style*="opacity"]').forEach((el) => {
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('transform', 'none', 'important');
    });
  });
  await page.addStyleTag({
    content: `
      html[data-a11y-settle="1"] .app-shell [style*="opacity"],
      html[data-a11y-settle="1"] .app-shell [data-testid="library-course-card"] {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  }).catch(() => undefined);
}

/** Full WCAG 2.1 A/AA scan including color-contrast. */
export function axeBuilder(page: Page) {
  return new AxeBuilder({ page }).withTags([...A11Y_TAGS]);
}

export function blockingViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
}

/**
 * Persist theme before React boots (and re-apply after). DOM-only setAttribute is
 * overwritten by App's applyTheme(store.user.settings.theme) on the next effect.
 */
export async function persistAppTheme(page: Page, theme: AppTheme) {
  await page.addInitScript((t) => {
    localStorage.setItem('synapse:theme-preference', JSON.stringify(t));
  }, theme);
}

export async function setAppTheme(page: Page, theme: AppTheme) {
  await page.evaluate((t) => {
    localStorage.setItem('synapse:theme-preference', JSON.stringify(t));
    try {
      const raw = localStorage.getItem('synapse:session-v2');
      if (raw) {
        const session = JSON.parse(raw) as { userSettings?: Record<string, unknown> };
        session.userSettings = { ...(session.userSettings ?? {}), theme: t };
        localStorage.setItem('synapse:session-v2', JSON.stringify(session));
      }
    } catch {
      /* ignore corrupt session */
    }
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme =
      t === 'light' || t === 'spectrum' || t === 'minimal' ? 'light' : 'dark';
  }, theme);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect
    .poll(async () => page.locator('html').getAttribute('data-theme'), { timeout: 10_000 })
    .toBe(theme);
}

export async function waitForLibraryReady(page: Page) {
  await settleMotionForAxe(page);
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
  // Notebook layout may omit classic `workspace-dock` — either chrome is valid.
  const classicDock = page.getByTestId('workspace-dock');
  const notebookLayout = page.getByTestId('notebook-workspace-layout');
  await expect(classicDock.or(notebookLayout).first()).toBeVisible({ timeout: 45_000 });
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
