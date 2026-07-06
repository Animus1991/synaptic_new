import { test, expect } from '@playwright/test';
import { enterStudyWorkspace, dismissProductTourIfOpen } from './helpers/a11y';
import { openToolInWorkspace } from './helpers/workspace';

test.describe('A11y — Canvas keyboard surfaces', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('concept map canvas is focusable with node tree and arrow navigation', async ({ page }) => {
    test.setTimeout(120_000);
    await enterStudyWorkspace(page);
    await dismissProductTourIfOpen(page);

    const conceptTool = page.getByTestId('dock-tool-concept-map');
    const notebookLayout = page.getByTestId('notebook-workspace-layout');
    if (await notebookLayout.isVisible().catch(() => false)) {
      await openToolInWorkspace(page, 'concept-map');
    } else if (await conceptTool.isVisible().catch(() => false)) {
      await conceptTool.click({ force: true });
    } else {
      test.skip(true, 'Concept map tool not available.');
    }

    const canvas = page.getByTestId('concept-map-canvas');
    if (!(await canvas.isVisible().catch(() => false))) {
      test.skip(true, 'Concept map empty — no canvas.');
    }

    await expect(canvas).toHaveAttribute('role', 'application');
    await expect(canvas).toHaveAttribute('tabindex', '0');

    const tree = page.getByTestId('concept-map-node-tree');
    await expect(tree).toHaveAttribute('role', 'tree');
    const treeItems = tree.locator('[role="treeitem"]');
    const nodeCount = await treeItems.count();
    expect(nodeCount).toBeGreaterThan(0);

    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await expect(canvas).toHaveAttribute('aria-activedescendant', /.+/);

    const activeId = await canvas.getAttribute('aria-activedescendant');
    expect(activeId).toMatch(/^concept-map-node-/);
  });

  test('whiteboard canvas is focusable and cycles tools with bracket keys', async ({ page }) => {
    test.setTimeout(120_000);
    await enterStudyWorkspace(page);
    await dismissProductTourIfOpen(page);

    const wbTool = page.getByTestId('dock-tool-whiteboard');
    const notebookLayout = page.getByTestId('notebook-workspace-layout');
    if (await notebookLayout.isVisible().catch(() => false)) {
      await openToolInWorkspace(page, 'whiteboard');
    } else if (await wbTool.isVisible().catch(() => false)) {
      await wbTool.click({ force: true });
    } else {
      test.skip(true, 'Whiteboard tool not available.');
    }

    const canvas = page.getByTestId('whiteboard-canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute('role', 'application');
    await expect(canvas).toHaveAttribute('tabindex', '0');

    const penBtn = page.getByRole('button', { name: 'Pen', pressed: true });
    await expect(penBtn).toBeVisible();

    await canvas.focus();
    await page.keyboard.press(']');
    await expect(page.getByRole('button', { name: 'Marker', pressed: true })).toBeVisible();
  });
});
