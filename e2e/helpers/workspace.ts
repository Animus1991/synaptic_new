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

/** Open any workspace tool — notebook Studio cards or classic dock. */
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
