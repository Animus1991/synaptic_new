/**
 * Wave WB — Whiteboard warm densify (screenshot-grounded)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave WB — Whiteboard productization', () => {
  const board = read('components/workspace/StudyWhiteboard.tsx');
  const panel = read('components/workspace/WhiteboardPanel.tsx');
  const coach = read('components/workspace/WhiteboardDiagramCoach.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const i18n = read('lib/i18n.ts');

  it('purpose is warm learner copy (no Agent coach blueprints jargon)', () => {
    expect(spine).toMatch(/Sketch the idea by hand/);
    expect(spine).toMatch(/Σκίτσαρε την ιδέα με το χέρι/);
    expect(spine).not.toMatch(/Agent coach blueprints/);
  });

  it('how-to is friendly and canvas-first', () => {
    expect(guide).toMatch(/Start drawing/);
    expect(guide).toMatch(/Ξεκίνα να σχεδιάζεις/);
  });

  it('drops nested Study Whiteboard title; ink + notes are progressive', () => {
    expect(board).not.toMatch(/>Study Whiteboard</);
    expect(board).toContain('data-testid="whiteboard-ink-menu"');
    expect(board).toContain('data-testid="whiteboard-notes-toggle"');
    expect(board).toContain('data-testid="whiteboard-empty-hint"');
    expect(board).toMatch(/notesOpen/);
  });

  it('color/thickness strip is not a permanent second toolbar row', () => {
    // Permanent strip used hardcoded English "Color" — must be gone
    expect(board).not.toMatch(/>Color</);
    expect(board).toContain('whiteboard-ink-menu');
  });

  it('coach and formula chrome use warm native labels', () => {
    expect(i18n).toMatch(/Drawing guide/);
    expect(i18n).toMatch(/Οδηγός σχεδίου/);
    expect(i18n).toMatch(/Get tips/);
    expect(i18n).toMatch(/Συμβουλές/);
    expect(panel).toContain('wbFormulasChrome');
    expect(coach).not.toMatch(/ws-chip-brand/);
  });

  it('empty canvas hint and notes rail test ids exist', () => {
    expect(board).toContain('wbEmptyCanvasHint');
    expect(board).toContain('whiteboard-notes-rail');
    expect(panel).toContain('data-testid="whiteboard-panel"');
  });
});
