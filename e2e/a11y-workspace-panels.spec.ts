import { test, expect } from '@playwright/test';
import {
  axeBuilder,
  blockingViolations,
  enterStudyWorkspace,
  formatAxeViolations,
  dismissProductTourIfOpen,
} from './helpers/a11y';
import type { Page } from '@playwright/test';

/**
 * Per-panel a11y audits inside the Workspace. For every dock tool we:
 *   - activate it via the dock
 *   - verify the tool header exposes an accessible name
 *   - verify cross-link buttons (if any) are labelled
 *   - run an axe scan limited to the active tool surface
 */

async function enterWorkspace(page: Page) {
  await enterStudyWorkspace(page);
  await dismissProductTourIfOpen(page);
}

test.describe('A11y — Workspace panels', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('every dock tool surface is labelled and axe-clean', async ({ page }) => {
    test.setTimeout(120_000);
    await enterWorkspace(page);

    const dock = page.getByTestId('workspace-dock');
    if (!(await dock.isVisible().catch(() => false))) {
      test.skip(true, 'Workspace dock not reachable.');
    }

    const tools = dock.locator('[data-testid^="dock-tool-"]');
    const count = await tools.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const tool = tools.nth(i);
      const toolId = (await tool.getAttribute('data-testid')) ?? `idx-${i}`;
      const label = await tool.getAttribute('aria-label');
      expect(label, `${toolId} missing aria-label`).toBeTruthy();

      await tool.click({ force: true });
      await page.waitForTimeout(250);

      // Cross-link buttons (when present) must all be labelled
      const crossLinks = page.locator('[data-testid^="crosslink-jump-"]');
      const cn = await crossLinks.count();
      for (let j = 0; j < cn; j++) {
        const lbl = await crossLinks.nth(j).getAttribute('aria-label');
        expect(lbl, `crosslink #${j} on ${toolId} missing aria-label`).toBeTruthy();
      }

      const results = await axeBuilder(page)
        .include('#workspace-main')
        .include('[data-testid="workspace-dock"]')
        .analyze();
      const blocking = blockingViolations(results);
      expect(
        blocking,
        `Blocking a11y on tool ${toolId}:\n${formatAxeViolations(blocking)}`,
      ).toEqual([]);
    }
  });

  test('command palette is labelled and axe-clean when open', async ({ page }) => {
    test.setTimeout(120_000);
    await enterWorkspace(page);

    const openBtn = page.getByTestId('workspace-command-palette-open');
    if (!(await openBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Command palette trigger not visible.');
    }
    await openBtn.click();
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible({ timeout: 10_000 });
    await expect(palette).toHaveAttribute('aria-modal', 'true');
    await expect(palette).toHaveAttribute('aria-label', /command palette/i);

    const results = await axeBuilder(page)
      .include('[data-testid="command-palette"]')
      .analyze();
    const blocking = blockingViolations(results);
    expect(blocking, formatAxeViolations(blocking)).toEqual([]);
  });
});
