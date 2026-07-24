/**
 * OPT-L6 — dump Library PNGs for human review (not a CI snapshot gate).
 * Run: npm run capture:library
 * Output: artifacts/library-l6/*.png + MANIFEST.md
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  dismissBlockingShellOverlays,
} from './helpers/onboarding';
import { waitForLibraryReady } from './helpers/a11y';
import {
  dismissPrimerOverlays,
  forcePrimerTheme,
  type PrimerCaptureTheme,
} from './helpers/primerCapture';

const CAPTURE_DIR = path.join(process.cwd(), 'artifacts', 'library-l6');

function ensureDir() {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
}

async function shot(page: Page, slug: string) {
  ensureDir();
  await page.waitForTimeout(200);
  const file = path.join(CAPTURE_DIR, `${slug}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return slug;
}

async function goLibraryDemo(page: Page) {
  await page.goto('/');
  await page.getByTestId('landing-see-demo').click();
  await waitForLibraryReady(page);
  await dismissBlockingShellOverlays(page);
  await dismissPrimerOverlays(page);
}

type ManifestRow = { slug: string; matrix: string; ok: boolean };

const manifest: ManifestRow[] = [];

test.describe.configure({ mode: 'serial' });

test('OPT-L6 Library capture matrix', async ({ page }) => {
  test.setTimeout(180_000);
  ensureDir();

  const themes: PrimerCaptureTheme[] = ['minimal', 'minimal-dark'];
  const viewports: Array<{ name: string; size: { width: number; height: number } }> = [
    { name: 'desktop', size: { width: 1280, height: 800 } },
    { name: 'tablet', size: { width: 768, height: 1024 } },
    { name: 'phone', size: { width: 390, height: 844 } },
  ];

  for (const theme of themes) {
    for (const vp of viewports) {
      await page.setViewportSize(vp.size);
      await goLibraryDemo(page);
      await forcePrimerTheme(page, theme);
      await waitForLibraryReady(page);
      const slug = `library-courses-${theme}-${vp.name}`;
      await shot(page, slug);
      manifest.push({ slug, matrix: `#1–5 ${theme} ${vp.name}`, ok: true });
    }
  }

  // Desktop Minimal detail shots
  await page.setViewportSize({ width: 1280, height: 800 });
  await goLibraryDemo(page);
  await forcePrimerTheme(page, 'minimal');

  const stacks = page.getByTestId('library-info-stacks');
  if (await stacks.isVisible().catch(() => false)) {
    await stacks.scrollIntoViewIfNeeded();
    await shot(page, 'library-infostack-minimal-desktop');
    manifest.push({ slug: 'library-infostack-minimal-desktop', matrix: '#6 InfoStack', ok: true });
  }

  const attention = page.getByTestId('library-filter-attention');
  if (await attention.isVisible().catch(() => false)) {
    await attention.click();
    await shot(page, 'library-filter-attention-minimal-desktop');
    manifest.push({ slug: 'library-filter-attention-minimal-desktop', matrix: '#7 Filter', ok: true });
  }

  await page.getByTestId('library-upload').click();
  await expect(page.getByRole('dialog').or(page.getByTestId('upload-modal')).first()).toBeVisible({
    timeout: 10_000,
  }).catch(() => null);
  await shot(page, 'library-upload-open-minimal-desktop');
  manifest.push({ slug: 'library-upload-open-minimal-desktop', matrix: '#8 Upload', ok: true });
  await page.keyboard.press('Escape');

  const filesTab = page.getByTestId('library-tab-files');
  if (await filesTab.isVisible().catch(() => false)) {
    await filesTab.click();
    await shot(page, 'library-files-minimal-desktop');
    manifest.push({ slug: 'library-files-minimal-desktop', matrix: '#9 Files', ok: true });
  }

  const md = [
    '# Library L6 capture manifest',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Slug | Matrix | OK |',
    '|------|--------|----|',
    ...manifest.map((r) => `| ${r.slug} | ${r.matrix} | ${r.ok ? 'yes' : 'no'} |`),
    '',
    'Human Pass checkboxes live in `docs/LIBRARY_SCREENSHOT_MATRIX.md` (do not self-sign).',
  ].join('\n');
  fs.writeFileSync(path.join(CAPTURE_DIR, 'MANIFEST.md'), md, 'utf8');
});
