import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export type PrimerCaptureTheme = 'minimal' | 'minimal-dark' | 'blueprint';

export const PRIMER_CAPTURE_DIR = path.join(process.cwd(), 'artifacts', 'primer-minimal');

export function ensurePrimerCaptureDir() {
  fs.mkdirSync(PRIMER_CAPTURE_DIR, { recursive: true });
}

/** Persist preference + apply DOM theme (demo onboarding may force dark). */
export async function forcePrimerTheme(page: Page, theme: PrimerCaptureTheme) {
  await page.evaluate((t) => {
    localStorage.setItem('synapse:theme-preference', JSON.stringify(t));
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme =
      t === 'minimal' ? 'light' : 'dark';
  }, theme);
  await expect
    .poll(async () => page.locator('html').getAttribute('data-theme'), { timeout: 5_000 })
    .toBe(theme);
}

export async function forceChromeDensity(page: Page, density: 'comfortable' | 'compact') {
  await page.evaluate((d) => {
    localStorage.setItem('synapse:chrome-density', JSON.stringify(d));
    document.documentElement.setAttribute('data-density', d);
  }, density);
}

export async function capturePrimerShot(
  page: Page,
  slug: string,
  opts?: { fullPage?: boolean },
) {
  ensurePrimerCaptureDir();
  const file = path.join(PRIMER_CAPTURE_DIR, `${slug}.png`);
  await page.screenshot({ path: file, fullPage: opts?.fullPage ?? false });
  return file;
}

/** Soft navigate — returns false if control missing (role-gated views). */
export async function clickNavIfPresent(page: Page, testId: string): Promise<boolean> {
  const nav = page.getByTestId(testId);
  if (!(await nav.isVisible().catch(() => false))) return false;
  await nav.click({ force: true });
  return true;
}

/** Dismiss palette / keyboard help / stray modals that block shell clicks. */
export async function dismissPrimerOverlays(page: Page) {
  for (let i = 0; i < 4; i += 1) {
    const help = page.getByTestId('workspace-keyboard-help');
    if (await help.isVisible().catch(() => false)) {
      const closeBtn = help.getByRole('button', { name: /close|κλείσιμο/i });
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      } else {
        // Backdrop click closes (onClose on the dialog root).
        await help.click({ position: { x: 4, y: 4 } });
      }
      await expect(help).toBeHidden({ timeout: 3_000 }).catch(() => undefined);
      continue;
    }
    const palette = page.getByTestId('command-palette');
    if (await palette.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(palette).toBeHidden({ timeout: 3_000 }).catch(() => undefined);
      continue;
    }
    const panel = page.getByTestId('notifications-panel');
    if (await panel.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden({ timeout: 3_000 }).catch(() => undefined);
      continue;
    }
    break;
  }
}
