import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const NOTES = `
# Microeconomics — Supply and Demand

Supply is the quantity of a good that producers are willing and able to sell at each price level.
Demand is the quantity that consumers are willing and able to buy at each price level.
Market equilibrium occurs where the supply curve intersects the demand curve.
`.trim();

async function openNotebookWorkspace(page: import('@playwright/test').Page) {
  await page.goto('/');
  await skipOnboardingToLibrary(page);

  await page.getByTestId('nav-library').click();
  await page.getByTestId('library-upload').click();
  await page.getByTestId('upload-paste').fill(NOTES);
  await page.getByTestId('upload-continue').click();
  await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('upload-generate').click();
  await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('course-open-workspace').click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
}

test.describe('NotebookLM workspace layout', () => {
  test.describe.configure({ timeout: 120_000 });

  test('shows 3-panel notebook layout with inline chat (no agent page redirect)', async ({ page }) => {
    await openNotebookWorkspace(page);

    const layout = page.getByTestId('notebook-workspace-layout');
    await expect(layout).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('notebook-sources-panel')).toBeVisible();
    await expect(page.getByTestId('notebook-chat-panel')).toBeVisible();
    await expect(page.getByTestId('notebook-studio-panel')).toBeVisible();

    await expect(page.getByTestId('workspace-inline-agent')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('agent-embedded')).toBeVisible();
    await expect(page.getByTestId('study-workspace')).toBeVisible();

    const agentNav = page.getByTestId('nav-agent');
    if (await agentNav.isVisible().catch(() => false)) {
      await expect(agentNav).toBeVisible();
    }
    await expect(page.getByTestId('agent-page')).not.toBeVisible();
  });

  test('compact context chip does not expand full banner by default', async ({ page }) => {
    await openNotebookWorkspace(page);
    await expect(page.getByTestId('agent-context-compact-chip')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('agent-context-popover')).not.toBeVisible();
  });

  test('studio AI sparkle uses per-tool prompt without leaving workspace', async ({ page }) => {
    await openNotebookWorkspace(page);
    await page.getByTestId('studio-card-ai-quiz').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible();
    await expect(page.getByTestId('agent-embedded')).toBeVisible();
    await expect(page.getByTestId('agent-page')).not.toBeVisible();
  });
});

test.describe('NotebookLM workspace mobile tabs', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.describe.configure({ timeout: 120_000 });

  test('switches Sources | Chat | Studio tabs on narrow viewport', async ({ page }) => {
    await openNotebookWorkspace(page);

    await expect(page.getByTestId('notebook-workspace-layout')).toHaveAttribute('data-layout', 'mobile');
    const tabs = page.getByTestId('notebook-mobile-tabs');
    await expect(tabs).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('notebook-tab-sources').click();
    await expect(page.getByTestId('notebook-source-list')).toBeVisible();

    await page.getByTestId('notebook-tab-studio').click();
    await expect(page.getByTestId('notebook-studio-grid')).toBeVisible();

    await page.getByTestId('notebook-tab-chat').click();
    await expect(page.getByTestId('agent-embedded')).toBeVisible();
  });
});
