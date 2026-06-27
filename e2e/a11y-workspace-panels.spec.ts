import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { skipOnboardingToLibrary } from './helpers/onboarding';
import type { Page } from '@playwright/test';

/**
 * Per-panel a11y audits inside the Workspace. For every dock tool we:
 *   - activate it via the dock
 *   - verify the tool header exposes an accessible name
 *   - verify cross-link buttons (if any) are labelled
 *   - run an axe scan limited to the active tool surface
 */

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function enterWorkspace(page: Page) {
  await page.goto('/');
  await skipOnboardingToLibrary(page);
  const firstItem = page.getByTestId(/^library-(lesson|task|course)-/).first();
  if (await firstItem.isVisible().catch(() => false)) {
    await firstItem.click();
  }
}

test.describe('A11y — Workspace panels', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('every dock tool surface is labelled and axe-clean', async ({ page }) => {
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

      await tool.click();
      // Allow lazy-loaded panel to render
      await page.waitForTimeout(150);

      // Cross-link buttons (when present) must all be labelled
      const crossLinks = page.locator('[data-testid^="crosslink-jump-"]');
      const cn = await crossLinks.count();
      for (let j = 0; j < cn; j++) {
        const lbl = await crossLinks.nth(j).getAttribute('aria-label');
        expect(lbl, `crosslink #${j} on ${toolId} missing aria-label`).toBeTruthy();
      }

      const results = await new AxeBuilder({ page })
        .withTags(A11Y_TAGS)
        .disableRules(['color-contrast'])
        .analyze();
      const blocking = results.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      );
      expect(
        blocking,
        `Blocking a11y on tool ${toolId}:\n${JSON.stringify(blocking, null, 2)}`,
      ).toEqual([]);
    }
  });

  test('command palette is labelled and axe-clean when open', async ({ page }) => {
    await enterWorkspace(page);

    const openBtn = page.getByTestId('workspace-command-palette-open');
    if (!(await openBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Command palette trigger not visible.');
    }
    await openBtn.click();
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    await expect(palette).toHaveAttribute('aria-modal', 'true');
    await expect(palette).toHaveAttribute('aria-label', /command palette/i);

    const results = await new AxeBuilder({ page })
      .include('[data-testid="command-palette"]')
      .withTags(A11Y_TAGS)
      .disableRules(['color-contrast'])
      .analyze();
    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
