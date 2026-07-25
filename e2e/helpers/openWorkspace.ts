import type { Page } from '@playwright/test';

/** Open Study Workspace via whatever chrome is available (nav is gated on live session). */
export async function openStudyWorkspaceFromShell(page: Page): Promise<void> {
  const candidates = [
    page.getByTestId('nav-workspace'),
    page.getByTestId('dashboard-open-workspace').first(),
    page.getByTestId('notebook-shell-open-workspace'),
    page.getByTestId('library-continue').first(),
    page.getByTestId('course-open-workspace'),
    page.getByRole('button', { name: /^Study Workspace$/i }),
  ];
  for (const loc of candidates) {
    if (await loc.isVisible().catch(() => false)) {
      await loc.click({ force: true });
      return;
    }
  }
  // Last resort: library card continue affordance in the rail.
  const railContinue = page.getByRole('button', { name: /Continue/i }).first();
  await railContinue.click({ force: true });
}
