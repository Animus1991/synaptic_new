import { test, expect } from '@playwright/test';
import { openStudyWorkspaceViaPalette, skipOnboardingNoDemo, skipOnboardingToLibrary } from './helpers/onboarding';
import { openToolInWorkspace, useClassicWorkspaceLayout } from './helpers/workspace';

/** Tools that must show upload-gated empty state — never fabricated rows, cards, etc. */
const TOOL_EMPTY_CASES: { dockId: string; emptyTool: string }[] = [
  { dockId: 'quiz', emptyTool: 'quiz' },
  { dockId: 'leitner', emptyTool: 'leitner' },
  { dockId: 'compare', emptyTool: 'compare' },
  { dockId: 'debate', emptyTool: 'debate' },
  { dockId: 'simulator', emptyTool: 'simulator' },
  { dockId: 'feynman', emptyTool: 'feynman' },
  { dockId: 'whiteboard', emptyTool: 'whiteboard' },
  { dockId: 'reader', emptyTool: 'reader' },
  { dockId: 'concept-map', emptyTool: 'concept-map' },
  { dockId: 'scratchpad', emptyTool: 'scratchpad' },
  { dockId: 'annotations', emptyTool: 'annotations' },
  { dockId: 'timer', emptyTool: 'timer' },
  { dockId: 'dashboard', emptyTool: 'dashboard' },
];

function uploadGatedEmpty(page: import('@playwright/test').Page, tool: string) {
  return page.locator(
    `[data-testid="workspace-empty-state"][data-tool="${tool}"][data-has-source="false"]`,
  );
}

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
    await skipOnboardingNoDemo(page);

    await openStudyWorkspaceViaPalette(page);
    await expect(page.locator('[data-testid="study-workspace"][data-grounded="false"]')).toBeVisible();
    await useClassicWorkspaceLayout(page);

    for (const { dockId, emptyTool } of TOOL_EMPTY_CASES) {
      await openToolInWorkspace(page, dockId as import('./helpers/workspace').WorkspaceDockToolId);
      await expect(uploadGatedEmpty(page, emptyTool)).toBeVisible({ timeout: 10_000 });
      // Regression guard: quiz must never show placeholder dash options or active session UI.
      await expect(page.getByText('- - -')).toHaveCount(0);
      await expect(page.getByTestId('quiz-panel')).toHaveCount(0);
      await expect(page.getByTestId('workspace-quiz')).toHaveCount(0);
    }
  });
});
