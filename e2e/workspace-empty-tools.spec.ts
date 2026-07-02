import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

/** Tools that must show an empty/degraded panel — never fabricated quiz rows, cards, etc. */
const TOOL_EMPTY_CASES: { dockId: string; emptyTestId: string }[] = [
  { dockId: 'quiz', emptyTestId: 'quiz-panel-empty' },
  { dockId: 'leitner', emptyTestId: 'leitner-panel-empty' },
  { dockId: 'compare', emptyTestId: 'compare-panel-empty' },
  { dockId: 'debate', emptyTestId: 'debate-panel-empty' },
  { dockId: 'simulator', emptyTestId: 'simulator-panel-empty' },
  { dockId: 'feynman', emptyTestId: 'workspace-empty-state' },
  { dockId: 'whiteboard', emptyTestId: 'workspace-empty-state' },
  { dockId: 'reader', emptyTestId: 'workspace-empty-state' },
];

test.describe('Workspace empty states without upload (P0)', () => {
  test.describe.configure({ timeout: 90_000 });

  test('Shell search shortcut shows platform-correct label (not mojibake)', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    const shortcut = page.getByTestId('shell-search-shortcut');
    await expect(shortcut).toBeVisible();
    const text = (await shortcut.textContent())?.trim() ?? '';
    expect(text).not.toContain('⌘');
    expect(text).toMatch(/^Ctrl\s*K$/i);
    expect(text).not.toMatch(/[\u0370-\u03FF]/);
  });

  test('each study tool shows empty state when workspace has no source', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('nav-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid="study-workspace"][data-grounded="false"]')).toBeVisible();

    for (const { dockId, emptyTestId } of TOOL_EMPTY_CASES) {
      await page.getByTestId(`dock-tool-${dockId}`).click();
      await expect(page.getByTestId(emptyTestId)).toBeVisible({ timeout: 10_000 });
      // Regression guard: quiz must never show placeholder dash options.
      await expect(page.getByText('- - -')).toHaveCount(0);
    }
  });
});
