import { test, expect } from '@playwright/test';

const NOTES = `
# Microeconomics — Supply and Demand

Supply is the quantity of a good that producers are willing and able to sell at each price level.
Demand is the quantity that consumers are willing and able to buy at each price level.
Market equilibrium occurs where the supply curve intersects the demand curve.

# Price Elasticity

Price elasticity of demand measures how responsive quantity demanded is to a change in price.
When demand is inelastic, consumers buy similar quantities even when prices rise sharply.
When demand is elastic, small price changes cause large shifts in quantity demanded.

Linear model example: y = m * x + b

| Type | Quantity response | Price sensitivity |
| ---- | ----------------- | ----------------- |
| Elastic demand | Large shift | High |
| Inelastic demand | Small shift | Low |
`.trim();

async function skipOnboarding(page: import('@playwright/test').Page) {
  await page.getByTestId('landing-get-started').click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Self-Learner' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Deeply understand material' }).click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByRole('button', { name: 'Skip — explore the demo first' }).click();
}

async function openGroundedStudyWorkspace(page: import('@playwright/test').Page) {
  await page.getByTestId('nav-library').click();
  await page.getByTestId('library-upload').click();
  await page.getByTestId('upload-paste').fill(NOTES);
  await page.getByTestId('upload-continue').click();
  await page.getByTestId('upload-generate').click();
  await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('course-open-workspace').click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-testid="study-workspace"][data-grounded="true"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/supply|demand|elasticity/i).first()).toBeVisible({ timeout: 15_000 });
}

test.describe('Study Workspace deep links (W2)', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await openGroundedStudyWorkspace(page);
  });

  test('lesson rail opens reader via deep link', async ({ page }) => {
    const readerBtn = page.getByTestId('lesson-open-tool-reader');
    await expect(readerBtn.first()).toBeVisible({ timeout: 15_000 });
    await readerBtn.first().click();
    await expect(page.getByTestId('cognitive-reader')).toBeVisible();
    await expect(page.getByText(/supply|demand|elasticity/i).first()).toBeVisible();
  });

  test('header tool tab opens reader', async ({ page }) => {
    await page.getByTestId('workspace-tool-reader').click();
    await expect(page.getByTestId('cognitive-reader')).toBeVisible();
  });

  test('header tool tab opens timer with exam countdown mode', async ({ page }) => {
    await page.getByTestId('workspace-tool-timer').click();
    await expect(page.getByTestId('study-timer')).toBeVisible();
    await page.getByTestId('timer-mode-exam').click();
    await expect(page.getByTestId('exam-target-input')).toBeVisible();
  });

  test('concept map export PNG control is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-concept-map').click();
    await expect(page.getByTestId('concept-map-export-png')).toBeVisible();
  });

  test('leitner Anki export control is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-leitner').click();
    await expect(page.getByTestId('leitner-export-anki')).toBeVisible({ timeout: 15_000 });
  });

  test('concept map force layout control is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-concept-map').click();
    await expect(page.getByTestId('concept-map-force-layout')).toBeVisible();
  });

  test('reader translation toggle is present when glossary exists', async ({ page }) => {
    await page.getByTestId('workspace-tool-reader').click();
    await expect(page.getByTestId('reader-translation-toggle')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('reader-translation-toggle').click();
    await expect(page.getByText(/source|πηγή/i).first()).toBeVisible();
  });
});

test.describe('Study Workspace W4 features', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await openGroundedStudyWorkspace(page);
  });

  test('compare table has sortable column headers', async ({ page }) => {
    await page.getByTestId('workspace-tool-compare').click();
    await expect(page.getByTestId('comparison-table')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('compare-sort-col-0')).toBeVisible();
  });

  test('whiteboard layers panel is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-whiteboard').click();
    await expect(page.getByTestId('whiteboard-layers')).toBeVisible();
    await expect(page.getByTestId('whiteboard-layer-add')).toBeVisible();
  });

  test('feynman rubric export control appears after writing', async ({ page }) => {
    await page.getByTestId('workspace-tool-feynman').click();
    const textarea = page.locator('textarea').first();
    await textarea.fill(
      'Supply is the quantity producers offer at each price. Demand is what buyers want. Equilibrium is where they meet. Elasticity measures price sensitivity.',
    );
    await expect(page.getByTestId('feynman-export-rubric')).toBeVisible({ timeout: 10_000 });
  });

  test('debate counter-argument control is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-debate').click();
    await expect(page.getByTestId('debate-add-counter').first()).toBeVisible({ timeout: 15_000 });
  });

  test('reader bilingual sync columns when translation enabled', async ({ page }) => {
    await page.getByTestId('workspace-tool-reader').click();
    await page.getByTestId('reader-translation-toggle').click();
    await expect(page.getByTestId('reader-bilingual-sync')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('reader-para-sync-0')).toBeVisible();
  });
});

test.describe('Study Workspace W5 features', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await openGroundedStudyWorkspace(page);
  });

  test('concept map hierarchy layout control is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-concept-map').click();
    await expect(page.getByTestId('concept-map-hierarchy-layout')).toBeVisible();
  });

  test('reader full-source toggle is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-reader').click();
    await expect(page.getByTestId('reader-full-source-toggle')).toBeVisible();
  });

  test('annotations panel shows when annotations tool opened', async ({ page }) => {
    await page.getByTestId('workspace-tool-annotations').click();
    await expect(page.getByTestId('annotation-overlay')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Study Workspace W6 features', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await openGroundedStudyWorkspace(page);
  });

  test('leitner due heatmap is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-leitner').click();
    await expect(page.getByTestId('leitner-due-heatmap')).toBeVisible({ timeout: 15_000 });
  });

  test('scratchpad graph plot control is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-scratchpad').click();
    await expect(page.getByText(/Formula Scratchpad/i)).toBeVisible({ timeout: 15_000 });
    const inputs = page.locator('input[placeholder="value"]');
    await inputs.nth(0).fill('2');
    await inputs.nth(2).fill('1');
    await expect(page.getByTestId('scratchpad-graph-plot')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('scratchpad-graph-plot').click();
    await expect(page.getByTestId('scratchpad-graph-panel')).toBeVisible();
  });

  test('timer calendar export control in exam mode', async ({ page }) => {
    await page.getByTestId('workspace-tool-timer').click();
    await page.getByTestId('timer-mode-exam').click();
    await expect(page.getByTestId('timer-export-calendar')).toBeVisible();
  });

  test('reader paragraph TTS control is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-reader').click();
    await expect(page.getByTestId('reader-tts-paragraphs')).toBeVisible();
  });
});

test.describe('Study Workspace W7 features', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await openGroundedStudyWorkspace(page);
  });

  test('compare diff toggle is present', async ({ page }) => {
    await page.getByTestId('workspace-tool-compare').click();
    await expect(page.getByTestId('compare-diff-toggle')).toBeVisible({ timeout: 15_000 });
  });

  test('sandbox sensitivity heatmap in economics mode', async ({ page }) => {
    await page.getByTestId('workspace-tool-simulator').click();
    await expect(page.getByTestId('sandbox-sensitivity-heatmap')).toBeVisible({ timeout: 15_000 });
  });

  test('whiteboard LaTeX stamp library toggle', async ({ page }) => {
    await page.getByTestId('workspace-tool-whiteboard').click();
    await page.getByTestId('whiteboard-latex-stamps').click();
    await expect(page.getByTestId('whiteboard-stamp-panel')).toBeVisible();
  });

  test('command palette exposes cross-tool macro', async ({ page }) => {
    await page.getByTestId('workspace-command-palette-open').click();
    await expect(page.getByTestId('command-palette')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('command-palette').getByRole('textbox').fill('Read');
    await expect(page.getByText(/Read:|Ανάγνωση:/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Study Workspace discoverability + W8', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await openGroundedStudyWorkspace(page);
  });

  test('discoverability panel and correlation bar are visible', async ({ page }) => {
    await expect(page.getByTestId('workspace-discoverability')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('workspace-correlation-bar')).toBeVisible();
    await expect(page.getByTestId('discoverability-action-open-command-palette')).toBeVisible();
  });

  test('quiz multi-item session with confidence rating', async ({ page }) => {
    const stepNav = page.locator('.flex.items-center.gap-1.px-3.py-2.border-b button').filter({ has: page.locator('span.w-4') });
    await stepNav.last().click();
    await expect(page.getByTestId('quiz-session')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('quiz-session-progress')).toBeVisible();
    await page.getByTestId('workspace-quiz').getByRole('button').first().click();
    await expect(page.getByTestId('quiz-confidence-rating')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('quiz-confidence-3').click();
    await page.getByTestId('quiz-session-confirm').click();
  });

  test('feynman voice input and auto-gap panel', async ({ page }) => {
    await page.getByTestId('workspace-tool-feynman').click();
    await expect(page.getByTestId('feynman-voice-input')).toBeVisible({ timeout: 10_000 });
    const textarea = page.locator('textarea').first();
    await textarea.fill(
      'Elasticity is price stuff. Sometimes quantity moves a bit when price changes but not always explained well.',
    );
    await expect(page.getByTestId('feynman-auto-gaps')).toBeVisible({ timeout: 10_000 });
  });

  test('debate rebuttal graph panel', async ({ page }) => {
    await page.getByTestId('workspace-tool-debate').click();
    await expect(page.getByTestId('debate-rebuttal-graph')).toBeVisible({ timeout: 15_000 });
  });

  test('concept map collaborative cursor canvas', async ({ page }) => {
    await page.getByTestId('workspace-tool-concept-map').click();
    await expect(page.getByTestId('concept-map-canvas')).toBeVisible({ timeout: 15_000 });
  });

  test('reader paragraph TTS still present in W8 build', async ({ page }) => {
    await page.getByTestId('workspace-tool-reader').click();
    await expect(page.getByTestId('reader-tts-paragraphs')).toBeVisible();
  });
});
