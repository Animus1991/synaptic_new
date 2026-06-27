/**
 * Verifies that when a dynamic-import / asset fetch fails, the user is *never*
 * left stranded — each flow shows a Try-again/Reload affordance and recovers
 * once the network unblocks.
 *
 * Covered flows:
 *   1. Study Workspace chunk fails on open → boot shell shows the error card,
 *      clicking Try again succeeds.
 *   2. Lazy overlay chunk (Analytics) fails → ErrorBoundary fallback offers
 *      Try again / Reload, both keep the rest of the app responsive.
 */

import { test, expect, type Route } from '@playwright/test';
import { skipOnboardingToLibrary } from './helpers/onboarding';

/** Match any URL whose path contains a needle (chunk, source module, dep). */
function urlContains(url: string, needle: string): boolean {
  return url.includes(needle);
}

test.describe('chunk-failure recovery', () => {
  test('study workspace recovers after a chunk-load failure', async ({ page }) => {
    // Fail any request that loads the StudyWorkspace module graph.
    let blocking = true;
    await page.route('**/*', (route: Route) => {
      const url = route.request().url();
      if (blocking && urlContains(url, 'StudyWorkspace') && !urlContains(url, 'StudyWorkspaceLazy') && !urlContains(url, 'StudyWorkspaceGate')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.goto('/');
    await skipOnboardingToLibrary(page);

    // Force-open a workspace via deep link button if available, else use the dock.
    await page.getByTestId('nav-dashboard').click().catch(() => {});
    // Trigger workspace from the dashboard CTA if present; fall back to library Continue.
    const openWorkspace = page.getByTestId('dashboard-open-workspace').first();
    if (await openWorkspace.isVisible().catch(() => false)) {
      await openWorkspace.click();
    } else {
      await page.getByTestId('nav-library').click();
    }

    // Boot shell must show an error card with a Try again button.
    const bootShell = page.getByTestId('workspace-boot-shell');
    await expect(bootShell).toBeVisible({ timeout: 20_000 });
    const tryAgain = bootShell.getByRole('button', { name: /try again|δοκιμάστε ξανά/i });
    await expect(tryAgain).toBeVisible({ timeout: 20_000 });

    // Unblock and retry — workspace should mount.
    blocking = false;
    await tryAgain.click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 30_000 });
  });

  test('lazy overlay shows recoverable fallback when its chunk fails', async ({ page }) => {
    let blocking = true;
    await page.route('**/*', (route: Route) => {
      const url = route.request().url();
      if (blocking && urlContains(url, 'Analytics') && !urlContains(url, 'analytics.spec')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await page.getByTestId('nav-analytics').click();

    // ErrorBoundary fallback exposes Try again + Reload.
    const tryAgain = page.getByRole('button', { name: /try again|δοκιμάστε ξανά/i });
    await expect(tryAgain).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /^reload$|επαναφόρτωση/i })).toBeVisible();

    // Unblock — Try again must re-mount Analytics without a full reload.
    blocking = false;
    await tryAgain.click();
    // Heuristic: the fallback message disappears once children remount.
    await expect(tryAgain).toBeHidden({ timeout: 20_000 });
  });
});
