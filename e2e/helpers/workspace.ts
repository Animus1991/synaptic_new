import { expect, type Page } from '@playwright/test';

/** Open the reader tool in either NotebookLM layout (default) or classic dock layout. */
export async function openReaderInWorkspace(page: Page) {
  const notebookLayout = page.getByTestId('notebook-workspace-layout');
  if (await notebookLayout.isVisible().catch(() => false)) {
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
