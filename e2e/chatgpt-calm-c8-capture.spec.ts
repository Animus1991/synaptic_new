/**
 * OPT-C8 — dump PNGs for ChatGPT-calm human review (not CI snapshot gates).
 * Run: npm run capture:chatgpt-calm
 * Output: artifacts/chatgpt-calm/*.png + MANIFEST.md
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  clearAppStorage,
  dismissBlockingShellOverlays,
  skipOnboardingToLibrary,
} from './helpers/onboarding';
import { waitForLibraryReady } from './helpers/a11y';
import {
  clickNavIfPresent,
  dismissPrimerOverlays,
  forceChromeDensity,
  forcePrimerTheme,
  type PrimerCaptureTheme,
} from './helpers/primerCapture';

const CALM_CAPTURE_DIR = path.join(process.cwd(), 'artifacts', 'chatgpt-calm');

function ensureCalmCaptureDir() {
  fs.mkdirSync(CALM_CAPTURE_DIR, { recursive: true });
}

async function captureCalmShot(page: Page, slug: string, opts?: { fullPage?: boolean }) {
  ensureCalmCaptureDir();
  const file = path.join(CALM_CAPTURE_DIR, `${slug}.png`);
  await page.screenshot({ path: file, fullPage: opts?.fullPage ?? false });
  return file;
}

async function openWorkspaceForCapture(page: Page) {
  const courseCard = page.getByTestId('library-course-card').first();
  await expect(courseCard).toBeVisible({ timeout: 15_000 });
  await courseCard.click();
  await expect(page.getByTestId('course-open-workspace')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('course-open-workspace').click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  await dismissBlockingShellOverlays(page);
}

type ManifestRow = { slug: string; matrix: string; ok: boolean; note?: string };

const manifest: ManifestRow[] = [];

async function shot(
  page: Page,
  slug: string,
  matrix: string,
  opts?: { fullPage?: boolean; note?: string },
) {
  await page.waitForTimeout(250);
  await captureCalmShot(page, slug, { fullPage: opts?.fullPage });
  manifest.push({ slug, matrix, ok: true, note: opts?.note });
}

async function skip(matrix: string, note: string) {
  const clean = note.replace(/\u001b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').slice(0, 160);
  manifest.push({ slug: '(skipped)', matrix, ok: false, note: clean });
}

async function settleShell(page: Page, theme: PrimerCaptureTheme = 'minimal') {
  await dismissBlockingShellOverlays(page);
  await dismissPrimerOverlays(page);
  await forcePrimerTheme(page, theme);
  await forceChromeDensity(page, 'comfortable');
}

async function goNav(page: Page, testId: string) {
  await dismissBlockingShellOverlays(page);
  await dismissPrimerOverlays(page);
  const ok = await clickNavIfPresent(page, testId);
  if (ok) await page.waitForTimeout(400);
  return ok;
}

function writeManifest() {
  ensureCalmCaptureDir();
  const lines = [
    '# OPT-C8 ChatGPT-calm capture manifest',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Matrix | File | OK | Note |',
    '|--------|------|----|------|',
    ...manifest.map((r) => {
      const file = r.ok ? `\`${r.slug}.png\`` : '-';
      const note = (r.note ?? '').replace(/\|/g, '/');
      return `| ${r.matrix} | ${file} | ${r.ok ? 'yes' : 'skip'} | ${note} |`;
    }),
    '',
    'Human: open PNGs, mark Pass? in `docs/CHATGPT_CALM_SCREENSHOT_MATRIX.md`.',
    '',
  ];
  fs.writeFileSync(path.join(CALM_CAPTURE_DIR, 'MANIFEST.md'), lines.join('\n'), 'utf8');
}

test.describe.configure({ mode: 'serial' });

test.describe('OPT-C8 ChatGPT-calm screenshot dump', () => {
  test.setTimeout(180_000);

  test('capture calm surfaces', async ({ page }) => {
    ensureCalmCaptureDir();
    try {
      await clearAppStorage(page);
      await forcePrimerTheme(page, 'minimal');
      await skipOnboardingToLibrary(page);
      await settleShell(page, 'minimal');
      await waitForLibraryReady(page);

      // C3 — Shell quiet nav (dashboard framing)
      if (await goNav(page, 'nav-dashboard')) {
        await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 15_000 });
        await shot(page, 'c3-shell-quiet-nav', '#C3 Shell quiet nav');
        await shot(page, 'c5-dashboard-soft', '#C5 Dashboard soft');
      } else {
        skip('#C3 Shell quiet nav', 'nav-dashboard missing');
        skip('#C5 Dashboard soft', 'nav-dashboard missing');
      }

      // C6 — Library soft list
      if (await goNav(page, 'nav-library')) {
        await waitForLibraryReady(page);
        const listView = page.getByRole('button', { name: /list view|προβολή λίστας|list/i });
        if (await listView.first().isVisible().catch(() => false)) {
          await listView.first().click({ force: true });
        }
        await shot(page, 'c6-library-soft-list', '#C6 Library soft list');
      } else {
        skip('#C6 Library soft list', 'nav-library missing');
      }

      // C1 / C2 — Agent calm + quiet modes
      if (await goNav(page, 'nav-agent')) {
        await expect(page.getByTestId('agent-page')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('agent-composer')).toBeVisible({ timeout: 10_000 });
        await shot(page, 'c1-agent-calm-thread', '#C1 Agent calm thread');
        await shot(page, 'c2-agent-quiet-modes', '#C2 Agent quiet modes');

        // C8 — seed a short exchange so regenerate can appear
        const input = page.getByTestId('agent-chat-input');
        if (await input.isVisible().catch(() => false)) {
          await input.fill('What is spaced repetition in one sentence?');
          await page.getByTestId('agent-send').click();
          await expect(page.getByTestId('agent-regenerate')).toBeVisible({ timeout: 45_000 }).catch(() => undefined);
          if (await page.getByTestId('agent-regenerate').isVisible().catch(() => false)) {
            await shot(page, 'c8-agent-regenerate', '#C8 Regenerate affordance');
          } else {
            skip('#C8 Regenerate affordance', 'regenerate not visible after send (offline/stream timing)');
          }
        } else {
          skip('#C8 Regenerate affordance', 'agent-chat-input missing');
        }

        // C7 — Minimal Dark Agent
        await forcePrimerTheme(page, 'minimal-dark');
        await shot(page, 'c7-agent-minimal-dark', '#C7 Agent Minimal Dark');
        await forcePrimerTheme(page, 'minimal');
      } else {
        skip('#C1 Agent calm thread', 'nav-agent missing');
        skip('#C2 Agent quiet modes', 'nav-agent missing');
        skip('#C7 Agent Minimal Dark', 'nav-agent missing');
        skip('#C8 Regenerate affordance', 'nav-agent missing');
      }

      // C4 — Notebook calm
      await goNav(page, 'nav-library');
      await waitForLibraryReady(page);
      try {
        await openWorkspaceForCapture(page);
        await forcePrimerTheme(page, 'minimal');
        if (await page.getByTestId('notebook-workspace-layout').isVisible().catch(() => false)) {
          await shot(page, 'c4-notebook-calm', '#C4 Notebook calm');
        } else {
          skip('#C4 Notebook calm', 'notebook layout not active');
        }
      } catch (err) {
        skip('#C4 Notebook calm', `open failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      expect(manifest.filter((r) => r.ok).length).toBeGreaterThan(3);
    } finally {
      writeManifest();
    }
  });
});
