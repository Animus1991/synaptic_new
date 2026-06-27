import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { skipOnboardingToLibrary } from './helpers/onboarding';

const NOTES = `
# Performance Budget Fixture

Intertemporal choice and present bias.
`.trim();

const IS_PROD_PERF = Boolean(process.env.PLAYWRIGHT_PROD_PERF);

/** B11 — Continue → workspace interactive budget (dev CI relaxed; prod preview gate + 1.2s stretch). */
const PROD_STRETCH_MS = 1_200;
/** Hard fail on stretch when stable — off until prod path median ≤1.2s on CI. */
const PROD_STRETCH_GATE = Boolean(process.env.PROD_STRETCH_GATE);
const PROD_INTERACTIVE_BUDGET_MS = Number(process.env.PROD_INTERACTIVE_BUDGET_MS)
  || (process.env.CI ? 20_000 : 12_000);
const INTERACTIVE_BUDGET_MS = IS_PROD_PERF
  ? PROD_INTERACTIVE_BUDGET_MS
  : process.env.CI
    ? 8_000
    : 12_000;

async function waitForWorkspaceEntryPrefetch(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => document.documentElement.dataset.workspaceEntryPrefetch === 'ready',
    undefined,
    { timeout: 30_000 },
  );
}

function recordProdStretchSample(elapsed: number): void {
  if (!IS_PROD_PERF) return;
  const payload = {
    elapsedMs: elapsed,
    stretchTargetMs: PROD_STRETCH_MS,
    withinStretch: elapsed <= PROD_STRETCH_MS,
    recordedAt: new Date().toISOString(),
  };
  const dir = join(process.cwd(), 'test-results');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'b11-prod-stretch.json'), `${JSON.stringify(payload)}\n`, 'utf8');
}

test.describe('Workspace perf budget (B11)', () => {
  test('course Continue → study-workspace within budget (upload path)', async ({ page }) => {
    test.skip(IS_PROD_PERF, 'Upload path uses dev budget only');
    test.setTimeout(120_000);
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('library-upload').click();
    await page.getByTestId('upload-paste').fill(NOTES);
    await page.getByTestId('upload-continue').click();
    await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('upload-generate').click();
    await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });

    await page.getByTestId('course-back').click();
    await page.getByTestId('library-course-card').first().click();
    await expect(page.getByTestId('course-open-workspace')).toBeVisible();
    await waitForWorkspaceEntryPrefetch(page);

    const t0 = Date.now();
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('workspace-tool-frame')).toBeVisible({ timeout: 15_000 });
    const elapsed = Date.now() - t0;

    expect(elapsed, `Expected interactive workspace ≤ ${INTERACTIVE_BUDGET_MS}ms, got ${elapsed}ms`).toBeLessThan(
      INTERACTIVE_BUDGET_MS,
    );
  });

  test('demo course Continue → interactive within prod cold budget', async ({ page }) => {
    test.skip(!IS_PROD_PERF, 'Prod preview gate only');
    test.setTimeout(60_000);
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    await page.getByTestId('library-course-card').first().click();
    await expect(page.getByTestId('course-open-workspace')).toBeVisible();
    await waitForWorkspaceEntryPrefetch(page);

    const t0 = Date.now();
    await page.getByTestId('course-open-workspace').click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('workspace-tool-frame')).toBeVisible({ timeout: 10_000 });
    const elapsed = Date.now() - t0;

    expect(elapsed, `Expected prod interactive ≤ ${INTERACTIVE_BUDGET_MS}ms, got ${elapsed}ms`).toBeLessThan(
      INTERACTIVE_BUDGET_MS,
    );

    recordProdStretchSample(elapsed);

    if (PROD_STRETCH_GATE) {
      expect(
        elapsed,
        `Expected prod stretch ≤ ${PROD_STRETCH_MS}ms, got ${elapsed}ms`,
      ).toBeLessThan(PROD_STRETCH_MS);
    } else if (elapsed > PROD_STRETCH_MS) {
      test.info().annotations.push({
        type: 'B11 stretch',
        description: `Continue → interactive ${elapsed}ms (stretch target ≤${PROD_STRETCH_MS}ms)`,
      });
    } else {
      test.info().annotations.push({
        type: 'B11 stretch',
        description: `Continue → interactive ${elapsed}ms (within stretch ≤${PROD_STRETCH_MS}ms)`,
      });
    }
  });
});
