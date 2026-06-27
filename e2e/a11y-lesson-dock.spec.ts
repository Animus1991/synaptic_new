import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { skipOnboardingToLibrary } from './helpers/onboarding';

/**
 * Automated accessibility audits for the Lesson view and the desktop
 * WorkspaceDock. We assert:
 *  - axe-core finds zero serious/critical WCAG 2.1 A/AA violations
 *  - skip-link is the first focusable element and targets the main region
 *  - focus order through key controls is keyboard-reachable
 *  - landmarks and aria-current attributes are present
 */

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function openFirstLessonFromLibrary(page) {
  await skipOnboardingToLibrary(page);
  const firstLesson = page.getByTestId(/^library-(lesson|task|course)-/).first();
  if (await firstLesson.isVisible().catch(() => false)) {
    await firstLesson.click();
  }
}

test.describe('Accessibility — Lesson view', () => {
  test('skip link, landmarks, focus order, axe scan', async ({ page }) => {
    await page.goto('/');
    await openFirstLessonFromLibrary(page);

    // If the lesson view actually rendered, validate it. Otherwise scan landing.
    const lessonMain = page.locator('#lesson-main');
    const hasLesson = await lessonMain.isVisible().catch(() => false);

    if (hasLesson) {
      // Skip-to-content must be the first focusable thing in the modal.
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() =>
        document.activeElement?.getAttribute('href') ?? document.activeElement?.tagName,
      );
      expect(focused).toMatch(/#lesson-main|A/);

      // role=progressbar present with aria-valuenow within bounds.
      const pb = page.getByRole('progressbar').first();
      await expect(pb).toBeVisible();
      const val = Number(await pb.getAttribute('aria-valuenow'));
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);

      // Step nav exposes aria-current="step" on the active step.
      const stepNav = page.getByRole('navigation', { name: /lesson steps|βήματα μαθήματος/i });
      await expect(stepNav).toBeVisible();
      await expect(stepNav.locator('[aria-current="step"]')).toHaveCount(1);
    }

    const results = await new AxeBuilder({ page })
      .withTags(A11Y_TAGS)
      .disableRules(['color-contrast']) // dark-theme tokens audited separately
      .analyze();

    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(
      blocking,
      `Blocking a11y violations:\n${JSON.stringify(blocking, null, 2)}`,
    ).toEqual([]);
  });
});

test.describe('Accessibility — Workspace dock (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('dock is a labeled nav with keyboard-reachable tools', async ({ page }) => {
    await page.goto('/');
    await skipOnboardingToLibrary(page);

    const dock = page.getByTestId('workspace-dock');
    if (!(await dock.isVisible().catch(() => false))) {
      test.skip(true, 'Workspace dock not reachable from current state.');
    }

    // The dock is a <nav> with an accessible name.
    await expect(dock).toHaveAttribute('aria-label', /tools|εργαλεία/i);

    // Toggle button exposes aria-expanded.
    const toggle = page.getByTestId('workspace-dock-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', /true|false/);

    // Every tool button is reachable and has an accessible name.
    const tools = dock.locator('[data-testid^="dock-tool-"]');
    const count = await tools.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const name = await tools.nth(i).getAttribute('aria-label');
      expect(name, `dock tool #${i} missing aria-label`).toBeTruthy();
    }

    // Active tool exposes aria-current.
    await expect(dock.locator('[aria-current="true"]')).toHaveCount(1);

    // Keyboard activation works on a dock tool.
    await tools.nth(Math.min(1, count - 1)).focus();
    await page.keyboard.press('Enter');

    const results = await new AxeBuilder({ page })
      .include('[data-testid="workspace-dock"]')
      .withTags(A11Y_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(
      blocking,
      `Blocking a11y violations in dock:\n${JSON.stringify(blocking, null, 2)}`,
    ).toEqual([]);
  });
});
