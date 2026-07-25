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

import { test, expect } from '@playwright/test';
import { skipOnboardingToLibrary, dismissBlockingShellOverlays } from './helpers/onboarding';
import { installChunkAbort, urlMatchesModuleFile } from './helpers/chunkBlock';
import { openStudyWorkspaceFromShell } from './helpers/openWorkspace';

test.describe('chunk-failure recovery', () => {
  test('study workspace recovers after a chunk-load failure', async ({ page }) => {
    test.setTimeout(90_000);
    const { setBlocking } = await installChunkAbort(page, (url) =>
      urlMatchesModuleFile(url, 'StudyWorkspace'),
    );

    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);

    await openStudyWorkspaceFromShell(page);
    await expect(
      page.getByTestId('workspace-boot-shell').or(page.getByTestId('study-workspace')),
    ).toBeVisible({ timeout: 20_000 });

    const bootShell = page.getByTestId('workspace-boot-shell');
    await expect(bootShell).toBeVisible({ timeout: 20_000 });
    const tryAgain = bootShell
      .getByTestId('workspace-boot-try-again')
      .or(bootShell.getByRole('button', { name: /try again|δοκιμάστε ξανά/i }));
    await expect(tryAgain).toBeVisible({ timeout: 45_000 });

    setBlocking(false);
    await tryAgain.click();
    await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 30_000 });
  });

  test('lazy overlay shows recoverable fallback when its chunk fails', async ({ page }) => {
    test.setTimeout(90_000);
    const { setBlocking } = await installChunkAbort(page, (url) =>
      urlMatchesModuleFile(url, 'Analytics'),
    );

    await page.goto('/');
    await skipOnboardingToLibrary(page);
    await dismissBlockingShellOverlays(page);

    await page.getByTestId('nav-analytics').click();

    const tryAgain = page
      .getByTestId('error-boundary-try-again')
      .or(page.getByRole('button', { name: /try again|δοκιμάστε ξανά/i }));
    await expect(tryAgain.first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: /^reload$|επαναφόρτωση/i }).first()).toBeVisible();
    await expect(page.getByText(/something went wrong|αποτυχία|failed to load/i).first()).toBeVisible();

    setBlocking(false);
    await tryAgain.first().click();
    await expect(tryAgain.first()).toBeHidden({ timeout: 20_000 });
  });
});
