/**
 * Wave G4 — tablet (≤1023) 44px touch matrix for densified tool chrome.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
const conceptMap = readFileSync(
  resolve(__dirname, '../../components/workspace/DraggableConceptMap.tsx'),
  'utf8',
);
const debate = readFileSync(
  resolve(__dirname, '../../components/workspace/ArgumentMap.tsx'),
  'utf8',
);
const debatePanel = readFileSync(
  resolve(__dirname, '../../components/workspace/DebatePanel.tsx'),
  'utf8',
);
const annotations = readFileSync(
  resolve(__dirname, '../../components/workspace/AnnotationOverlay.tsx'),
  'utf8',
);

describe('Wave G — toolbar disclosure + tablet touch matrix', () => {
  it('Concept Map keeps primary toolbar; view tools live in overflow', () => {
    expect(conceptMap).toContain('data-testid="concept-map-toolbar"');
    expect(conceptMap).toContain('concept-map-more-menu');
    expect(conceptMap).toContain('concept-map-zoom-in');
    // Zoom no longer a permanent icon row in the primary strip
    const toolbar = conceptMap.slice(
      conceptMap.indexOf('concept-map-toolbar'),
      conceptMap.indexOf('concept-map-layers-chrome') > 0
        ? conceptMap.indexOf('concept-map-layers-chrome')
        : conceptMap.indexOf('concept-map-large-graph-banner'),
    );
    expect(toolbar).not.toMatch(/aria-live="polite"/);
  });

  it('Debate collapses suggested counters + demotes Ask Agent chrome', () => {
    expect(debate).toContain('debate-tree-toolbar');
    expect(debate).toContain('debate-suggested-counters-chrome');
    expect(debate).toContain('CollapsibleChromeSection');
    expect(debatePanel).toContain('debate-panel-toolbar');
    expect(debatePanel).toContain('ws-touch-floor');
  });

  it('Annotations filter strip uses OverflowChipRow (max 4)', () => {
    expect(annotations).toContain('annotation-filter-strip');
    expect(annotations).toContain('OverflowChipRow');
    expect(annotations).toContain('annotation-filter-chips');
    expect(annotations).toMatch(/maxVisible=\{4\}/);
  });

  it('CSS tablet floor covers Concept Map / Debate / Annotations toolbars', () => {
    expect(css).toMatch(/max-width:\s*1023px/);
    expect(css).toContain('concept-map-toolbar');
    expect(css).toContain('debate-panel-toolbar');
    expect(css).toContain('debate-tree-toolbar');
    expect(css).toContain('annotation-filter-strip');
    expect(css).toMatch(/min-height:\s*2\.75rem/);
  });
});
