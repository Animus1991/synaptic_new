/**
 * Wave F0 — engineering gates for the hard-refresh visual QA checklist.
 * Visual density still needs a human eyeball; these assert the spot-check
 * targets cannot silently regress in source.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const chrome = read('components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx');
const whiteboard = read('components/workspace/StudyWhiteboard.tsx');
const simulator = read('components/workspace/SimulatorPanel.tsx');
const progress = read('components/workspace/MiniDashboard.tsx');
const agent = read('components/Agent.tsx');
const css = read('index.css');

describe('Wave F0 — hard-refresh spot-check contracts', () => {
  it('close control has aria-label but no native title tooltip', () => {
    const closeBlocks = chrome.split('onClick={onClose}');
    expect(closeBlocks.length).toBeGreaterThan(1);
    for (const block of closeBlocks.slice(1)) {
      const head = block.slice(0, 280);
      expect(head).not.toMatch(/\btitle=/);
      expect(head).toMatch(/aria-label=\{t\('(wsCloseWorkspace|close)'\)\}/);
    }
  });

  it('Whiteboard defaults layers collapsed + icon draw toolbar', () => {
    expect(whiteboard).toMatch(/useState\(false\)[\s\S]{0,80}showLayers|showLayers[\s\S]{0,80}useState\(false\)/);
    expect(whiteboard).toContain('data-testid="whiteboard-draw-toolbar"');
    expect(whiteboard).toContain('ws-touch-floor');
  });

  it('Simulator exposes denser meta strip', () => {
    expect(simulator).toContain('data-testid="simulator-meta-strip"');
    expect(simulator).toContain('ws-touch-floor');
  });

  it('Progress tool chips use OverflowChipRow (max 3)', () => {
    expect(progress).toContain('OverflowChipRow');
    expect(progress).toContain('testId="progress-tool-chips"');
    expect(progress).toMatch(/maxVisible=\{3\}/);
    expect(progress).toContain('progress-tool-${tool}');
  });

  it('GUIDE control has no native title tooltip', () => {
    const header = read('components/workspace/WorkspaceToolHeader.tsx');
    const toggle = header.slice(header.indexOf('workspace-tool-header-toggle'));
    const btn = toggle.slice(0, 550);
    expect(btn).toContain("aria-label={t('toolGuideAria')}");
    expect(btn).not.toMatch(/\btitle=\{/);
  });

  it('Listen (TTS) uses caption + secondary ink + min-h-9', () => {
    const tts = agent.slice(agent.indexOf('data-testid="agent-tts-toggle"'));
    const cls = tts.slice(0, 500);
    expect(cls).toContain('type-caption');
    expect(cls).toContain('text-text-secondary');
    expect(cls).toContain('min-h-9');
    expect(cls).not.toMatch(/type-micro/);
  });

  it('F5 radius remap + F6 tablet touch floor remain in CSS', () => {
    expect(css).toMatch(
      /\[data-testid="study-workspace"\]\s*\.rounded-lg\s*\{\s*border-radius:\s*var\(--radius-md\)/,
    );
    expect(css).toMatch(/max-width:\s*1023px/);
    expect(css).toContain('whiteboard-draw-toolbar');
    expect(css).toContain('agent-composer-tools');
  });
});
