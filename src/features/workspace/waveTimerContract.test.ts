/**
 * Wave TM — Timer densify: hero ring full-bleed + warm hierarchy
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave TM — Timer productization', () => {
  const panel = read('components/workspace/TimerPanel.tsx');
  const study = read('components/workspace/StudyTimer.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const i18n = read('lib/i18n.ts');
  const registry = read('lib/workspaceToolRegistry.ts');
  const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');
  const css = read('index.css');
  const syncQa = read('lib/simulatorTimerPresetSyncQA.ts');

  it('is full-bleed hero (no nest gutter / no xl side modes column)', () => {
    expect(panel).toContain('data-testid="timer-panel"');
    expect(panel).toContain('data-bleed="full"');
    expect(study).toContain('data-bleed="full"');
    expect(study).toContain('data-layout="hero"');
    expect(study).toContain('data-testid="timer-hero"');
    expect(study).not.toMatch(/xl:grid-cols-\[1fr_minmax/);
    expect(surface).toMatch(/activeTool !== 'timer'/);
    expect(css).toContain('ux-pomodoro-ring-hero');
  });

  it('nests session details + lengths + exam blocks; strips warn-only', () => {
    expect(panel).toContain('data-testid="timer-session-chrome"');
    expect(panel).toContain('alwaysCollapse');
    expect(panel).toMatch(/!countdownReport\.syncOk/);
    expect(panel).toMatch(/!presetSyncReport\.ok/);
    expect(study).toContain('data-testid="timer-lengths-chrome"');
    expect(study).toContain('data-testid="timer-exam-blocks-chrome"');
    expect(study).toContain('data-testid="timer-recent-chrome"');
  });

  it('primary CTA is Start via PrimaryCTA', () => {
    expect(study).toContain('data-testid="timer-play-pause"');
    expect(study).toContain('PrimaryCTA');
    expect(study).toContain("{t('start')}");
    expect(study).toContain('timerModeFocus');
    expect(study).not.toMatch(/>\s*Pomodoro\s*</);
  });

  it('purpose + banners drop simulator-presets / Dashboard↔Timer / raw deep50 ids', () => {
    expect(spine).toMatch(/Focus now, or count down to your exam/);
    expect(spine).toMatch(/Εστίασε τώρα/);
    expect(spine).not.toMatch(/synced with simulator presets/);
    expect(i18n).not.toMatch(/Dashboard ↔ Timer countdown/);
    expect(i18n).not.toMatch(/Dashboard ↔ Timer αντίστροφη/);
    expect(i18n).toMatch(/Focus length · \{preset\}/);
    expect(i18n).toMatch(/Exam countdown/);
    expect(i18n).toMatch(/matches Progress/);
    expect(registry).toMatch(/Focus & exam countdown/);
    expect(syncQa).toContain('examPracticeLabel');
    expect(syncQa).toContain('t(input.linkedTimerPreset, lang)');
  });

  it('session length descriptions are complete (no mid-sentence Deep 50 cut)', () => {
    expect(i18n).toMatch(/50 minutes of deep work, then a 10-minute recovery/);
    expect(i18n).toMatch(/50 λεπτά βαθιά δουλειά, μετά ανάκαμψη 10 λεπτών/);
  });

  it('TM2 Session lengths chrome is full-bleed (no shrink-wrap flex / no sidebar gutters)', () => {
    const modes = read('components/workspace/PomodoroSessionModeList.tsx');
    expect(study).toContain('data-testid="timer-lengths-body"');
    expect(study).toContain('hideLabel');
    expect(study).not.toMatch(/PomodoroSessionModeList[\s\S]{0,200}className="flex"/);
    expect(modes).toContain('data-bleed="full"');
    expect(modes).toContain('w-full');
    expect(css).toMatch(/\.ux-pomodoro-mode-list\s*\{[^}]*width:\s*100%/);
    expect(css).toMatch(/\.ux-pomodoro-mode-list-stack\s*\{[^}]*width:\s*100%/);
  });
});
