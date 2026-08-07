/**
 * Wave H3 — Settings densify: grouped nav + full-bleed IDE layout + warm AI chrome
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave H3 — Settings productization', () => {
  const settings = read('components/Settings.tsx');
  const content = read('lib/settingsContent.ts');
  const app = read('App.tsx');

  it('is full-bleed IDE layout (no masonry columns-2 gutters)', () => {
    expect(settings).toContain('data-testid="settings-page"');
    expect(settings).toContain('data-bleed="full"');
    expect(settings).toContain('data-testid="settings-work-surface"');
    expect(settings).toContain('settings-ide-layout');
    expect(settings).toContain('settings-ide-content');
    expect(settings).not.toMatch(/lg:columns-2/);
  });

  it('groups nav into Learning / Account / Advanced', () => {
    expect(settings).toContain('data-testid="settings-section-nav"');
    expect(settings).toContain('data-testid={`settings-nav-group-${group.id}`}');
    expect(content).toMatch(/navGroupLearning: 'Learning'/);
    expect(content).toMatch(/navGroupLearning: 'Μάθηση'/);
    expect(content).toMatch(/navGroupAccount: 'Account'/);
    expect(content).toMatch(/navGroupAdvanced: 'Advanced'/);
    expect(content).toMatch(/navGroupAdvanced: 'Για προχωρημένους'/);
  });

  it('primary CTA is Back to study via PrimaryCTA', () => {
    expect(settings).toContain('data-testid="settings-done-studying"');
    expect(settings).toContain('PrimaryCTA');
    expect(settings).toContain('doneStudyingCta');
    expect(content).toMatch(/doneStudyingCta: 'Back to study'/);
    expect(content).toMatch(/doneStudyingCta: 'Πίσω στη μελέτη'/);
    expect(app).toContain('onDoneStudying={() => store.navigate(\'dashboard\')}');
  });

  it('nests Connection & models + Color legend closed by default', () => {
    expect(settings).toContain('data-testid="settings-ai-advanced-chrome"');
    expect(settings).toContain('data-testid="settings-color-legend-chrome"');
    expect(settings).toContain('alwaysCollapse');
    expect(content).toMatch(/aiAdvancedChrome: 'Connection & models'/);
    expect(content).toMatch(/aiAdvancedChrome: 'Σύνδεση & μοντέλα'/);
  });

  it('learner copy drops FSRS/IRT / AI & LLM / adaptive-engine jargon', () => {
    expect(content).toMatch(/sectionAiLlm: 'Tutor & AI'/);
    expect(content).toMatch(/sectionAiLlm: 'Βοηθός & AI'/);
    expect(content).toMatch(/Choose how Synapse teaches you/);
    expect(content).not.toMatch(/adaptive engine/);
    expect(content).not.toMatch(/FSRS\/IRT/);
    expect(content).not.toMatch(/sectionAiLlm: 'AI & LLM'/);
    expect(content).toMatch(/Smarter Tutor & Feynman answers/);
  });
});
