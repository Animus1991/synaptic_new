import { expect, type Page } from '@playwright/test';

export type WorkspaceDockToolId =
  | 'reader'
  | 'concept-map'
  | 'scratchpad'
  | 'whiteboard'
  | 'leitner'
  | 'feynman'
  | 'quiz'
  | 'simulator'
  | 'compare'
  | 'debate'
  | 'timer'
  | 'annotations'
  | 'dashboard';

async function isNotebookWorkspace(page: Page): Promise<boolean> {
  return page.getByTestId('notebook-workspace-layout').isVisible().catch(() => false);
}

/** Open the reader tool in either NotebookLM layout (default) or classic dock layout. */
export async function openReaderInWorkspace(page: Page) {
  if (await isNotebookWorkspace(page)) {
    const mobileTabs = page.getByTestId('notebook-mobile-tabs');
    if (await mobileTabs.isVisible().catch(() => false)) {
      await page.getByTestId('notebook-tab-sources').click();
    }
    const sourceRow = page.locator('[data-testid^="notebook-source-row-"]').first();
    await expect(sourceRow).toBeVisible({ timeout: 15_000 });
    await sourceRow.click();
  } else {
    await page.getByTestId('dock-tool-reader').click();
  }
  await expect(page.getByTestId('cognitive-reader')).toBeVisible({ timeout: 15_000 });
}

/** Switch to classic dock layout when notebook mode hides the tool dock. */
export async function useClassicWorkspaceLayout(page: Page) {
  const notebook = page.getByTestId('notebook-workspace-layout');
  if (!(await notebook.isVisible().catch(() => false))) return;

  const chromeMenu = page.getByTestId('notebook-chrome-menu');
  if (await chromeMenu.isVisible().catch(() => false)) {
    await chromeMenu.click();
    await page.getByRole('button', { name: /Classic view|Κλασική προβολή/i }).click({ force: true });
  } else {
    const toggle = page.getByTestId('workspace-notebook-toggle');
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
    } else {
      await page.evaluate(() => {
        localStorage.setItem('synapse:workspace-notebook-mode', JSON.stringify(false));
      });
      await page.reload();
      await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    }
  }
  await expect(page.getByTestId('notebook-workspace-layout')).toHaveCount(0, { timeout: 15_000 });
}

export async function openToolInWorkspace(page: Page, toolId: WorkspaceDockToolId) {
  if (toolId === 'reader') {
    await openReaderInWorkspace(page);
    return;
  }
  if (await isNotebookWorkspace(page)) {
    const mobileTabs = page.getByTestId('notebook-mobile-tabs');
    if (await mobileTabs.isVisible().catch(() => false)) {
      await page.getByTestId('notebook-tab-studio').click();
    }
    const card = page.getByTestId(`studio-card-${toolId}`);
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
  } else {
    await page.getByTestId(`dock-tool-${toolId}`).click();
  }
}
