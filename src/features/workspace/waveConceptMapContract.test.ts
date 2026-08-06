/**
 * Wave CM — Concept Map warm densify (screenshot-grounded)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave CM — Concept Map productization', () => {
  const map = read('components/workspace/DraggableConceptMap.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const i18n = read('lib/i18n.ts');
  const shell = read('components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx');

  it('purpose is warm learner copy (not repo/visualize jargon)', () => {
    expect(spine).toMatch(/See how ideas connect/);
    expect(spine).toMatch(/Δες πώς συνδέονται οι ιδέες/);
    expect(spine).not.toMatch(/Visualize and rearrange concept relationships/);
  });

  it('how-to avoids graph-jargon and uses friendly steps', () => {
    expect(guide).toMatch(/colors show how solid/);
    expect(guide).toMatch(/κάρτες ιδεών/);
    expect(guide).toMatch(/drag only moves/);
    expect(guide).not.toMatch(/draggable graph/);
  });

  it('empty is work-first composer with Add idea CTA', () => {
    expect(map).toContain('data-testid="concept-map-empty-composer"');
    expect(map).toContain('data-testid="concept-map-empty-start"');
    expect(map).toContain('PrimaryCTA');
    expect(map).toContain('conceptMapEmptyHint');
    expect(empty).toMatch(/Nothing mapped yet/);
  });

  it('primary toolbar keeps find + add + link; tidy/zoom demoted', () => {
    expect(map).toContain('data-testid="concept-map-toolbar"');
    expect(map).toContain('concept-map-add-node');
    expect(map).toContain('concept-map-connect');
    expect(map).toContain('concept-map-more-menu');
    expect(map).toContain('data-testid="concept-map-zoom-hud"');
    expect(map).not.toContain('concept-map-auto-layout-btn');
    const toolbar = map.slice(
      map.indexOf('concept-map-toolbar'),
      map.indexOf('concept-map-layers-chrome') > 0
        ? map.indexOf('concept-map-layers-chrome')
        : map.indexOf('concept-map-canvas'),
    );
    // Force/tidy only as overflow item — not a peer primary chip with its own auto-layout btn
    expect(toolbar).toContain('concept-map-force-layout');
    expect(toolbar).toContain('concept-map-zoom-in');
  });

  it('legend is progressive disclosure', () => {
    expect(map).toContain('data-testid="concept-map-legend"');
    expect(i18n).toMatch(/What the colors mean/);
    expect(i18n).toMatch(/Τι σημαίνουν τα χρώματα/);
  });

  it('native labels prefer idea/link over node/edge jargon', () => {
    expect(i18n).toMatch(/Add idea/);
    expect(i18n).toMatch(/Νέα ιδέα/);
    expect(i18n).toMatch(/Tidy up/);
    expect(i18n).toMatch(/Τακτοποίηση/);
    expect(i18n).toMatch(/Remove link/);
    expect(i18n).toMatch(/Find an idea/);
  });

  it('workspace shell keeps warm sentence-case column titles + tutor grounding', () => {
    expect(shell).toMatch(/Your files/);
    expect(shell).toMatch(/Answers from your notes/);
    expect(shell).toMatch(/Απαντά με βάση τις σημειώσεις σου/);
    expect(shell).toMatch(/normal-case/);
  });

  it('CM2 nodes are label-first (no type glyph / raw % in center)', () => {
    expect(map).toContain('concept-map-node-inner-label');
    expect(map).toContain('wrapConceptMapLabel');
    expect(map).toContain('masteryCaption');
    expect(map).not.toMatch(/conceptTypeGlyph/);
  });

  it('CM3 idea chips are full-bleed; tap focuses, drag does not', () => {
    expect(map).toContain('data-testid="concept-map-root"');
    expect(map).toContain('data-bleed="full"');
    expect(map).toContain('concept-map-node-chip');
    expect(map).toContain('nodeChipSize');
    expect(map).toContain('NODE_CLICK_SLOP_PX');
    expect(map).toContain('nodeGesture');
    expect(map).not.toMatch(/BlueprintSurface/);
    const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');
    expect(surface).toMatch(/activeTool !== 'concept-map'/);
  });
});
