/**
 * OPT-M20 — dump PNGs for human review (not CI snapshot gates).
 * Run: npm run capture:primer-minimal
 * Output: artifacts/primer-minimal/*.png + MANIFEST.md
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
import { openToolInWorkspace, type WorkspaceDockToolId } from './helpers/workspace';
import {
  capturePrimerShot,
  clickNavIfPresent,
  dismissPrimerOverlays,
  ensurePrimerCaptureDir,
  forceChromeDensity,
  forcePrimerTheme,
  PRIMER_CAPTURE_DIR,
  type PrimerCaptureTheme,
} from './helpers/primerCapture';

/** Open study workspace; notebook layout may omit classic `workspace-dock`. */
async function openWorkspaceForCapture(page: Page) {
  const courseCard = page.getByTestId('library-course-card').first();
  await expect(courseCard).toBeVisible({ timeout: 15_000 });
  await courseCard.click();
  await expect(page.getByTestId('course-open-workspace')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('course-open-workspace').click();
  await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  await dismissBlockingShellOverlays(page);
}

async function closeWorkspaceForCapture(page: Page) {
  if (!(await page.getByTestId('study-workspace').isVisible().catch(() => false))) return;
  const closeBtn = page
    .getByTestId('study-workspace')
    .getByRole('button', { name: /close|κλείσιμο/i })
    .first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ force: true });
  }
  await expect(page.getByTestId('study-workspace')).toHaveCount(0, { timeout: 20_000 });
  await dismissBlockingShellOverlays(page);
}

/** Close workspace → set classic preference → reopen (remount reads localStorage). */
async function reopenWorkspaceClassic(page: Page): Promise<boolean> {
  await page.evaluate(() => {
    localStorage.setItem('synapse:workspace-notebook-mode', JSON.stringify(false));
  });
  await closeWorkspaceForCapture(page);
  await goNav(page, 'nav-library');
  await waitForLibraryReady(page);
  await openWorkspaceForCapture(page);
  const stillNotebook = await page.getByTestId('notebook-workspace-layout').isVisible().catch(() => false);
  return !stillNotebook;
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
  await capturePrimerShot(page, slug, { fullPage: opts?.fullPage });
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

async function openCommandPalette(page: Page) {
  await dismissPrimerOverlays(page);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
  await expect(page.getByTestId('command-palette')).toBeVisible({ timeout: 8_000 });
}

async function closeOverlays(page: Page) {
  await dismissPrimerOverlays(page);
}

function writeManifest() {
  ensurePrimerCaptureDir();
  const lines = [
    '# OPT-M20 capture manifest',
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
    'Human: open PNGs, mark Pass? in `docs/PRIMER_MINIMAL_SCREENSHOT_MATRIX.md`.',
    '',
  ];
  fs.writeFileSync(path.join(PRIMER_CAPTURE_DIR, 'MANIFEST.md'), lines.join('\n'), 'utf8');
}

test.describe.configure({ mode: 'serial' });

test.describe('OPT-M20 Primer Minimal screenshot dump', () => {
  test.setTimeout(360_000);

  test('capture matrix surfaces', async ({ page }) => {
    ensurePrimerCaptureDir();
    try {
    // 1 — Landing (fresh)
    await clearAppStorage(page);
    await forcePrimerTheme(page, 'minimal');
    await expect(page.getByTestId('landing-get-started')).toBeVisible({ timeout: 15_000 });
    await shot(page, '01-landing-minimal', '#1 Landing');

    // Enter app
    await skipOnboardingToLibrary(page);
    await settleShell(page, 'minimal');
    await waitForLibraryReady(page);

    // 2 — Dashboard Minimal
    if (await goNav(page, 'nav-dashboard')) {
      await expect(page.getByTestId('platform-main')).toBeVisible({ timeout: 15_000 });
      await shot(page, '02-dashboard-minimal', '#2 Shell Dashboard Minimal');
    } else {
      skip('#2 Shell Dashboard Minimal', 'nav-dashboard missing');
    }

    // 3 — Dashboard Minimal Dark
    await forcePrimerTheme(page, 'minimal-dark');
    await shot(page, '03-dashboard-minimal-dark', '#3 Shell Dashboard Minimal Dark');
    await forcePrimerTheme(page, 'minimal');

    // 4 — Library
    if (await goNav(page, 'nav-library')) {
      await shot(page, '04-library-minimal', '#4 Library');
    } else {
      skip('#4 Library', 'nav-library missing');
    }

    // 5 — Course path tab
    const courseCard = page.getByTestId('library-course-card').first();
    if (await courseCard.isVisible().catch(() => false)) {
      await courseCard.click();
      await expect(page.getByTestId('course-open-workspace')).toBeVisible({ timeout: 15_000 });
      const pathTab = page.getByTestId('course-tab-path');
      if (await pathTab.isVisible().catch(() => false)) {
        await pathTab.click();
      }
      await shot(page, '05-course-path-minimal', '#5 Course (path tab)');
      // back via library for subsequent nav
      await goNav(page, 'nav-library');
    } else {
      skip('#5 Course (path tab)', 'no library-course-card');
    }

    // 6 — Tasks
    if (await goNav(page, 'nav-tasks')) {
      await shot(page, '06-tasks-minimal', '#6 Tasks');
    } else {
      skip('#6 Tasks', 'nav-tasks missing');
    }

    // 7 — Agent
    if (await goNav(page, 'nav-agent')) {
      await shot(page, '07-agent-minimal', '#7 Agent');
    } else {
      skip('#7 Agent', 'nav-agent missing');
    }

    // 8 — Analytics
    if (await goNav(page, 'nav-analytics')) {
      await shot(page, '08-analytics-minimal', '#8 Analytics');
    } else {
      skip('#8 Analytics', 'nav-analytics missing');
    }

    // 9 — Teacher (role-gated)
    if (await goNav(page, 'nav-teacher')) {
      await shot(page, '09-teacher-minimal', '#9 Teacher dashboard');
    } else {
      skip('#9 Teacher dashboard', 'role-gated (self-learner demo)');
    }

    // 10 — Student Org
    if (await goNav(page, 'nav-student-org')) {
      await shot(page, '10-student-org-minimal', '#10 Student Org');
    } else {
      skip('#10 Student Org', 'nav missing or role-gated');
    }

    // 11 — Settings → Interface
    if (await goNav(page, 'nav-settings')) {
      const iface = page.getByTestId('settings-section-interface').or(
        page.getByRole('button', { name: /interface|διεπαφή/i }),
      );
      if (await iface.first().isVisible().catch(() => false)) {
        await iface.first().click();
      }
      await shot(page, '11-settings-interface', '#11 Settings → Interface');
    } else {
      skip('#11 Settings → Interface', 'nav-settings missing');
    }

    // 12 — Shell inbox
    await goNav(page, 'nav-dashboard');
    await settleShell(page, 'minimal');
    const bell = page.getByTestId('shell-notifications-bell');
    if (await bell.isVisible().catch(() => false)) {
      await bell.click({ force: true });
      await expect(page.getByTestId('notifications-panel')).toBeVisible({ timeout: 8_000 });
      await shot(page, '12-shell-inbox-minimal', '#12 Shell inbox (bell)');
      await closeOverlays(page);
    } else {
      skip('#12 Shell inbox (bell)', 'bell missing');
    }

    // 13 — ⌘K + ?
    await openCommandPalette(page);
    await shot(page, '13a-command-palette-minimal', '#13 Shell ⌘K');
    await closeOverlays(page);
    // Focus body so `?` is a shortcut, not a typed character.
    await page.locator('body').click({ position: { x: 8, y: 8 }, force: true });
    await page.keyboard.press('?');
    const help = page.getByTestId('workspace-keyboard-help');
    if (await help.isVisible().catch(() => false)) {
      await shot(page, '13b-shell-help-minimal', '#13 Shell ? help');
      await closeOverlays(page);
      await expect(help).toBeHidden({ timeout: 5_000 });
    } else {
      skip('#13 Shell ? help', '? did not open help (focus/overlay?)');
    }

    // Workspace surfaces (14–22)
    await goNav(page, 'nav-library');
    await waitForLibraryReady(page);
    await openWorkspaceForCapture(page);
    await forcePrimerTheme(page, 'minimal');
    await forceChromeDensity(page, 'compact');

    // 15 first while notebook default
    if (await page.getByTestId('notebook-workspace-layout').isVisible().catch(() => false)) {
      await shot(page, '15-workspace-notebook-minimal', '#15 Workspace notebook');
    } else {
      skip('#15 Workspace notebook', 'notebook layout not active');
    }

    const classicOk = await reopenWorkspaceClassic(page);
    await forcePrimerTheme(page, 'minimal');
    await forceChromeDensity(page, 'compact');
    if (classicOk) {
      await shot(page, '14-workspace-classic-compact', '#14 Workspace classic Compact');
    } else {
      await shot(page, '14-workspace-notebook-compact-fallback', '#14 Workspace classic Compact', {
        note: 'Classic remount failed — notebook+compact fallback',
      });
    }

    const tools: Array<{ id: WorkspaceDockToolId; slug: string; matrix: string }> = [
      { id: 'reader', slug: '16-tool-reader-compact', matrix: '#16 Tool: Reader' },
      { id: 'annotations', slug: '17-tool-annotations', matrix: '#17 Tool: Annotations' },
      { id: 'quiz', slug: '18-tool-quiz-compact', matrix: '#18 Tool: Quiz' },
      { id: 'leitner', slug: '19-tool-leitner', matrix: '#19 Tool: Leitner' },
      { id: 'simulator', slug: '20-tool-simulator', matrix: '#20 Tool: Simulator' },
      { id: 'concept-map', slug: '21-tool-concept-map', matrix: '#21 Tool: Concept map' },
      { id: 'feynman', slug: '22-tool-feynman', matrix: '#22 Tool: Feynman' },
    ];

    for (const t of tools) {
      try {
        await openToolInWorkspace(page, t.id);
        await page.waitForTimeout(500);
        await shot(page, t.slug, t.matrix);
      } catch (err) {
        skip(t.matrix, `open failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Leave workspace → Note Analysis / Exam Prep via palette
    await closeWorkspaceForCapture(page);
    await settleShell(page, 'minimal');

    // 23 — Note Analysis
    try {
      await openCommandPalette(page);
      await page.getByTestId('command-palette-input').fill('note analysis');
      await page.getByTestId('command-quick-note-analysis').click();
      await page.waitForTimeout(600);
      await shot(page, '23-note-analysis-minimal', '#23 Note Analysis');
      await closeOverlays(page);
    } catch (err) {
      skip('#23 Note Analysis', `palette nav failed: ${err instanceof Error ? err.message : String(err)}`);
      await closeOverlays(page);
    }

    // 24 — Exam Prep
    try {
      await openCommandPalette(page);
      await page.getByTestId('command-palette-input').fill('exam');
      await page.getByTestId('command-quick-exam').click();
      await page.waitForTimeout(600);
      await shot(page, '24-exam-prep-minimal', '#24 Exam Prep setup');
      await closeOverlays(page);
    } catch (err) {
      skip('#24 Exam Prep setup', `palette nav failed: ${err instanceof Error ? err.message : String(err)}`);
      await closeOverlays(page);
    }

    // 25 — Mobile workspace (soft-skip if library empty after exam-prep flow)
    try {
      await goNav(page, 'nav-library');
      await waitForLibraryReady(page);
      const hasCourse = await page.getByTestId('library-course-card').first().isVisible().catch(() => false);
      if (!hasCourse) {
        skip('#25 Mobile workspace', 'no library-course-card after exam-prep (manual fill-in)');
      } else {
        await page.setViewportSize({ width: 390, height: 844 });
        await dismissBlockingShellOverlays(page);
        const mobileLibrary = page.getByTestId('nav-mobile-library');
        if (await mobileLibrary.isVisible().catch(() => false)) {
          await mobileLibrary.click({ force: true });
        }
        await openWorkspaceForCapture(page);
        await forcePrimerTheme(page, 'minimal');
        await shot(page, '25-mobile-workspace-minimal', '#25 Mobile workspace');
      }
    } catch (err) {
      skip('#25 Mobile workspace', `open failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 26 — Reduced motion (desktop dashboard)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await settleShell(page, 'minimal');
    if (await goNav(page, 'nav-dashboard')) {
      await shot(page, '26-reduced-motion-dashboard', '#26 Reduced motion');
    } else {
      skip('#26 Reduced motion', 'dashboard nav missing after reload');
    }

    expect(manifest.filter((r) => r.ok).length).toBeGreaterThan(8);
    } finally {
      writeManifest();
    }
  });
});
